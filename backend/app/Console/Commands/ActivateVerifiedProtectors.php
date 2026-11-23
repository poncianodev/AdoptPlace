<?php

namespace App\Console\Commands;

use App\Enums\OrganizationStatus;
use App\Models\Organization;
use App\Services\ProtectorActivation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ActivateVerifiedProtectors extends Command
{
    protected $signature = 'protectors:activate-verified
        {--database= : Exact configured MongoDB database name}
        {--profile= : Exact organization ID}
        {--apply : Activate the selected profile and record an audit entry}';

    protected $description = 'Preview legacy verified protectors and activate one explicitly selected profile';

    public function handle(ProtectorActivation $activation): int
    {
        $database = $this->option('database');
        $profileId = $this->option('profile');
        if (! filled($database) || $database !== config('database.connections.mongodb.database')) {
            $this->error('Informe o nome exato do banco configurado com --database.');

            return self::FAILURE;
        }

        if ($this->option('apply')) {
            if (! filled($profileId)) {
                $this->error('Para aplicar, informe um ID revisado na prévia com --profile.');

                return self::FAILURE;
            }

            $applied = DB::connection('mongodb')->transaction(function () use ($profileId, $activation) {
                $profile = Organization::find($profileId);

                return $profile && $activation->activate($profile, 'legacy_command');
            }, 3);

            if (! $applied) {
                $this->warn('Perfil inexistente ou inelegível. Nenhuma alteração aplicada.');

                return self::FAILURE;
            }

            $this->info('Perfil ativado e decisão registrada na auditoria.');

            return self::SUCCESS;
        }

        $query = Organization::where('type', 'independent_protector')
            ->where('verification_status', OrganizationStatus::Pending->value);
        if (filled($profileId)) {
            $query->whereKey($profileId);
        }

        $this->info('Prévia sem escrita. Identificadores internos dos perfis elegíveis:');
        $count = 0;
        foreach ($query->cursor() as $profile) {
            if ($activation->eligibleOwner($profile)) {
                $this->line((string) $profile->id);
                $count++;
            }
        }
        $this->info("Perfis elegíveis: {$count}");

        return self::SUCCESS;
    }
}
