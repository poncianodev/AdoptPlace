<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\PresenceVerifierInterface;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $presence = \Mockery::mock(PresenceVerifierInterface::class);
        $presence->shouldReceive('getCount')->andReturn(0);
        Validator::setPresenceVerifier($presence);
    }

    private function validateAccount(array $overrides = [])
    {
        $data = array_replace_recursive([
            'account_type' => 'adopter', 'name' => 'Ana', 'email' => 'ana@example.test',
            'phone' => '11999999999', 'password' => 'Encontro#123',
            'password_confirmation' => 'Encontro#123', 'terms' => true,
            'address' => ['cep' => '01001000', 'city' => 'São Paulo', 'state' => 'SP'],
        ], $overrides);
        $request = RegisterRequest::create('/api/v1/auth/register', 'POST', $data);

        return Validator::make($data, $request->rules(), $request->messages());
    }

    public function test_adopter_does_not_need_provider_fields_and_cannot_assign_a_role(): void
    {
        $validator = $this->validateAccount(['role' => 'admin', 'organization_id' => 'other']);
        $this->assertTrue($validator->passes(), $validator->errors()->toJson());
        $this->assertArrayNotHasKey('role', $validator->validated());
        $this->assertArrayNotHasKey('organization_id', $validator->validated());
    }

    public function test_providers_require_profile_address_and_responsible_adoption(): void
    {
        foreach (['ngo', 'independent_protector'] as $type) {
            $validator = $this->validateAccount(['account_type' => $type]);
            $this->assertTrue($validator->fails());
            foreach (['provider_name', 'description', 'address.street', 'address.number', 'responsible_adoption'] as $field) {
                $this->assertTrue($validator->errors()->has($field), $field);
            }
        }
    }

    public function test_ngo_can_register_without_cnpj_but_cannot_claim_an_invalid_one(): void
    {
        $data = ['account_type' => 'ngo', 'provider_name' => 'Amigos dos animais',
            'description' => 'Acolhemos animais e buscamos adoções responsáveis.',
            'responsible_adoption' => true, 'has_cnpj' => false,
            'address' => ['street' => 'Praça da Sé', 'number' => '10', 'neighborhood' => 'Sé']];
        $this->assertTrue($this->validateAccount($data)->passes());
        $data['has_cnpj'] = true;
        $data['cnpj'] = '00000000000000';
        $this->assertTrue($this->validateAccount($data)->errors()->has('cnpj'));
    }

    public function test_weak_and_mismatched_passwords_are_rejected(): void
    {
        foreach (['1234567890', 'abcdefghij', 'Abcdefghij', 'Abcdefg123', 'Ab1!'] as $password) {
            $this->assertTrue($this->validateAccount(['password' => $password, 'password_confirmation' => $password])->fails());
        }
        $this->assertTrue($this->validateAccount(['password_confirmation' => 'different'])->errors()->has('password'));
    }

    public function test_adopter_cannot_access_organization_or_publish_animals(): void
    {
        $user = new User(['name' => 'Ana', 'role' => UserRole::Adopter, 'status' => 'active']);
        $user->setRelation('organization', null);
        $this->actingAs($user, 'web')->getJson('/api/v1/organization')->assertForbidden();
        $this->postJson('/api/v1/organization/pets', [])->assertForbidden();
    }

    public function test_provider_management_enforces_role_type_email_and_approval(): void
    {
        $cases = [
            ['ngo', 'pending', true, 'ngo_pending'],
            ['ngo', 'approved', false, 'email_unverified'],
            ['ngo', 'approved', true, null],
            ['independent_protector', 'pending', false, 'email_unverified'],
            ['independent_protector', 'pending', true, 'protector_pending'],
            ['independent_protector', 'approved', true, null],
            ['independent_protector', 'suspended', true, 'profile_suspended'],
            ['independent_protector', 'rejected', true, 'profile_rejected'],
            ['unknown', 'approved', true, 'profile_unavailable'],
        ];

        foreach ($cases as [$type, $status, $verified, $reason]) {
            $organization = new Organization(['type' => $type, 'verification_status' => $status]);
            $organization->id = 'profile-one';
            $user = new User(['role' => UserRole::OrganizationOwner, 'status' => 'active', 'organization_id' => 'profile-one']);
            $user->id = 'provider-one';
            $user->email_verified_at = $verified ? now() : null;
            $user->setRelation('organization', $organization);

            $this->actingAs($user, 'sanctum');
            $resource = (new UserResource($user))->resolve();
            $this->assertSame($reason === null, $resource['can_manage_animals']);
            $this->assertSame($reason, $resource['animal_management_block_reason']);
            $response = $this->postJson('/api/v1/organization/pets', []);
            if ($reason === null) {
                $response->assertUnprocessable()->assertJsonValidationErrors('name');
            } else {
                $response->assertForbidden()->assertJsonPath('reason', $reason);
            }
        }
    }

    public function test_private_addresses_are_encrypted_and_not_serialized(): void
    {
        $address = ['street' => 'Rua privada', 'number' => '10'];
        $user = new User(['address' => $address]);
        $org = new Organization(['address' => 'Legacy address', 'private_address' => $address]);
        $this->assertSame($address, $user->address);
        $this->assertStringNotContainsString('Rua privada', $user->getAttributes()['address']);
        $this->assertArrayNotHasKey('address', $user->toArray());
        $this->assertSame('Legacy address', $org->address);
        $this->assertArrayNotHasKey('private_address', $org->toArray());
    }
}
