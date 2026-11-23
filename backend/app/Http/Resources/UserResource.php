<?php

namespace App\Http\Resources;

use App\Services\AnimalManagementAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $reason = AnimalManagementAccess::blockedReason($this->resource);

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role?->value ?? $this->role,
            'status' => $this->status,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'can_manage_animals' => $reason === null,
            'animal_management_block_reason' => $reason,
            'organization' => new OrganizationResource($this->whenLoaded('organization')),
        ];
    }
}
