<?php

namespace App\Services;

use App\Enums\OrganizationStatus;
use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;

class ProtectorActivation
{
    public function __construct(private AuditService $audit) {}

    public function eligibleOwner(Organization $profile): ?User
    {
        if ($profile->type !== 'independent_protector' || $profile->verification_status !== OrganizationStatus::Pending) {
            return null;
        }

        $members = $profile->users()->limit(2)->get();
        $owner = $members->first();

        return $members->count() === 1 && $owner->role === UserRole::OrganizationOwner
            && $owner->status === 'active' && $owner->hasVerifiedEmail() ? $owner : null;
    }

    /** Run inside the caller's MongoDB transaction so activation and audit commit together. */
    public function activate(Organization $profile, string $source, ?User $expectedOwner = null): bool
    {
        $owner = $this->eligibleOwner($profile);
        if (! $owner || ($expectedOwner && (string) $owner->id !== (string) $expectedOwner->id)) {
            return false;
        }

        $updated = Organization::whereKey($profile->getKey())
            ->where('type', 'independent_protector')
            ->where('verification_status', OrganizationStatus::Pending->value)
            ->update(['verification_status' => OrganizationStatus::Approved->value, 'approved_at' => now()]);

        if ($updated) {
            $this->audit->record($source === 'email_verification' ? $owner : null, 'organization.protector_auto_activated', $profile, [
                'source' => $source,
                'owner_id' => (string) $owner->id,
            ]);
        }

        return $updated > 0;
    }
}
