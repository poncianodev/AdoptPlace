<?php

namespace App\Services;

use App\Enums\OrganizationStatus;
use App\Enums\UserRole;
use App\Models\User;

class AnimalManagementAccess
{
    public static function blockedReason(User $user): ?string
    {
        if ($user->status !== 'active') {
            return 'account_inactive';
        }

        if ($user->role !== UserRole::OrganizationOwner) {
            return 'not_provider';
        }

        $profile = $user->organization;
        if (! $profile || ! in_array($profile->type, ['ngo', 'independent_protector'], true)
            || (string) $user->organization_id !== (string) $profile->getKey()) {
            return 'profile_unavailable';
        }

        return match (true) {
            $profile->verification_status === OrganizationStatus::Suspended => 'profile_suspended',
            $profile->verification_status === OrganizationStatus::Rejected => 'profile_rejected',
            ! $user->hasVerifiedEmail() => 'email_unverified',
            $profile->isApproved() => null,
            $profile->type === 'ngo' => 'ngo_pending',
            default => 'protector_pending',
        };
    }
}
