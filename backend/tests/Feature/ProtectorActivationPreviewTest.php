<?php

namespace Tests\Feature;

use Closure;
use Illuminate\Support\Facades\DB;
use MongoDB\Collection;
use MongoDB\Driver\CursorInterface;
use MongoDB\Laravel\Connection;
use Tests\TestCase;

class ProtectorActivationPreviewTest extends TestCase
{
    public function test_preview_queries_only_pending_protectors_without_opening_a_transaction_or_writing(): void
    {
        config(['database.connections.mongodb.database' => 'preview-fixture']);
        $connection = new class(['driver' => 'mongodb', 'database' => 'preview-fixture', 'dsn' => 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=100']) extends Connection
        {
            public array $collections = [];

            public function getCollection($name): Collection
            {
                return $this->collections[$name];
            }

            public function transaction(Closure $callback, $attempts = 1, array $options = []): mixed
            {
                throw new \LogicException('Preview must not open a transaction.');
            }
        };
        DB::extend('mongodb', fn () => $connection);
        DB::purge('mongodb');

        $profiles = $this->mock(Collection::class);
        $connection->collections = ['organizations' => $profiles];

        $profiles->shouldReceive('find')->once()->withArgs(
            fn (array $filter) => $filter === ['$and' => [
                ['type' => 'independent_protector'],
                ['verification_status' => 'pending'],
            ]],
        )->andReturn($this->emptyCursor());

        $this->artisan('protectors:activate-verified', ['--database' => 'preview-fixture'])
            ->expectsOutput('Perfis elegíveis: 0')
            ->assertSuccessful();
    }

    private function emptyCursor(): CursorInterface
    {
        $cursor = \Mockery::mock(CursorInterface::class);
        $cursor->shouldReceive('rewind')->once();
        $cursor->shouldReceive('valid')->once()->andReturnFalse();

        return $cursor;
    }
}
