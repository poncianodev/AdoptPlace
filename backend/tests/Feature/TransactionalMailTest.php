<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class TransactionalMailTest extends TestCase
{
    public function test_resend_configuration_resolves_the_native_transport_without_sending(): void
    {
        config(['services.resend.key' => 'test-placeholder']);

        $this->assertInstanceOf(ResendTransport::class, Mail::mailer('resend')->getSymfonyTransport());
    }

    public function test_password_recovery_dispatches_a_notification_with_a_valid_reset_link(): void
    {
        Notification::fake();
        $user = $this->user();
        $provider = $this->mock(UserProvider::class);
        $provider->shouldReceive('retrieveByCredentials')->once()
            ->with(['email' => $user->email])->andReturn($user);
        Auth::provider('mail-test', fn () => $provider);
        config([
            'auth.providers.users.driver' => 'mail-test',
            'auth.passwords.users.store' => 'array',
            'app.frontend_url' => 'https://frontend.example.test',
        ]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function ($notification, $channels) use ($user) {
            $url = $notification->toMail($user)->actionUrl;
            $this->assertStringStartsWith('https://frontend.example.test/redefinir-senha?', $url);
            parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
            $this->assertSame($user->email, $query['email']);
            $this->assertSame($notification->token, $query['token']);
            $this->assertTrue(Password::broker()->tokenExists($user, $query['token']));

            return $channels === ['mail'];
        });
    }

    public function test_verification_resend_dispatches_a_notification_with_a_signed_link(): void
    {
        Notification::fake();
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertOk();

        Notification::assertSentTo($user, VerifyEmail::class, function ($notification, $channels) use ($user) {
            $url = $notification->toMail($user)->actionUrl;
            $this->assertSame('/email/verify/'.$user->id.'/'.sha1($user->email), parse_url($url, PHP_URL_PATH));
            $this->assertTrue(URL::hasValidSignature(Request::create($url)));

            return $channels === ['mail'];
        });
    }

    private function user(): User
    {
        $user = new User(['name' => 'Ana', 'email' => 'ana@example.test', 'status' => 'active']);
        $user->id = 'mail-test-user';

        return $user;
    }
}
