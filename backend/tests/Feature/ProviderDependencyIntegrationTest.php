<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProviderDeletionSafety;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProviderDependencyIntegrationTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();
        $this->actingAs($user);
        config(['provider_workflow.permanent_delete_enabled' => true]);
        $this->visibility(true);
    }

    private function visibility(bool $complete): void
    {
        $safety = \Mockery::mock(ProviderDeletionSafety::class)->makePartial();
        $safety->shouldReceive('metadataVisibilityIsComplete')->andReturn($complete);
        $this->app->instance(ProviderDeletionSafety::class, $safety);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('qa_provider_dependencies');
        parent::tearDown();
    }

    private function provider(): int
    {
        return $this->postJson('/api/admin/providers', ['name' => 'Example synthetic bank', 'code' => 'QA_DEP', 'description' => null, 'logo_path' => null, 'is_active' => true, 'sort_order' => 4])->assertOk()->json('data.id');
    }

    public function test_restrict_cascade_and_set_null_dependencies_are_all_blocked_without_changes(): void
    {
        $id = $this->provider();
        $before = DB::table('providers')->orderBy('id')->get()->toJson();
        foreach (['restrict', 'cascade', 'set null'] as $action) {
            Schema::create('qa_provider_dependencies', function (Blueprint $table) use ($action): void {
                $table->id();
                $table->unsignedBigInteger('provider_id')->nullable();
                $table->foreign('provider_id')->references('id')->on('providers')->onDelete($action);
            });
            DB::table('qa_provider_dependencies')->insert(['provider_id' => $id]);
            $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(409);
            $this->assertDatabaseHas('qa_provider_dependencies', ['provider_id' => $id]);
            $this->assertSame($before, DB::table('providers')->orderBy('id')->get()->toJson());
            Schema::drop('qa_provider_dependencies');
        }
    }

    public function test_non_id_constraint_and_undeclared_relationship_fail_closed(): void
    {
        $id = $this->provider();
        Schema::create('qa_provider_dependencies', function (Blueprint $table): void {
            $table->id();
            $table->string('provider_code', 40);
            $table->foreign('provider_code')->references('code')->on('providers')->cascadeOnDelete();
        });
        DB::table('qa_provider_dependencies')->insert(['provider_code' => 'QA_DEP']);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        $this->assertDatabaseHas('qa_provider_dependencies', ['provider_code' => 'QA_DEP']);
        Schema::drop('qa_provider_dependencies');
        Schema::create('qa_provider_dependencies', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('provider_id');
        });
        DB::table('qa_provider_dependencies')->insert(['provider_id' => $id]);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        $this->assertDatabaseHas('providers', ['id' => $id]);
    }

    public function test_metadata_error_empty_visibility_and_default_disabled_policy_preserve_provider(): void
    {
        $id = $this->provider();
        $this->visibility(false);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        $this->visibility(true);
        $safety = \Mockery::mock(ProviderDeletionSafety::class)->makePartial();
        $safety->shouldReceive('metadataVisibilityIsComplete')->andReturn(true);
        $safety->shouldReceive('loadInventory')->andThrow(new \RuntimeException('Synthetic private metadata error'));
        $this->app->instance(ProviderDeletionSafety::class, $safety);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503)->assertDontSee('Synthetic private');
        $safety = \Mockery::mock(ProviderDeletionSafety::class)->makePartial();
        $safety->shouldReceive('metadataVisibilityIsComplete')->andReturn(true);
        $safety->shouldReceive('loadInventory')->andReturn([[], [], []]);
        $this->app->instance(ProviderDeletionSafety::class, $safety);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        config(['provider_workflow.permanent_delete_enabled' => false]);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        $this->assertDatabaseHas('providers', ['id' => $id]);
        $this->assertDatabaseMissing('audit_logs', ['entity_type' => 'provider', 'entity_id' => $id, 'action' => 'deleted']);
    }

    public function test_self_and_composite_constraints_are_rejected(): void
    {
        $id = $this->provider();
        Schema::table('providers', function (Blueprint $table): void {
            $table->unsignedBigInteger('parent_provider_id')->nullable();
            $table->foreign('parent_provider_id')->references('id')->on('providers')->nullOnDelete();
        });
        DB::table('providers')->where('id', $id)->update(['parent_provider_id' => $id]);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        Schema::table('providers', function (Blueprint $table): void {
            $table->dropForeign(['parent_provider_id']);
            $table->unique(['id', 'code'], 'qa_id_code_unique');
        });
        Schema::create('qa_provider_dependencies', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('provider_id');
            $table->string('provider_code', 40);
            $table->foreign(['provider_id', 'provider_code'])->references(['id', 'code'])->on('providers')->cascadeOnDelete();
        });
        DB::table('qa_provider_dependencies')->insert(['provider_id' => $id, 'provider_code' => 'QA_DEP']);
        $this->deleteJson('/api/admin/providers/'.$id)->assertStatus(503);
        $this->assertDatabaseHas('providers', ['id' => $id]);
    }

    private function worker(array $operation): array
    {
        if (! function_exists('proc_open')) {
            $this->markTestSkipped('Local process creation unavailable; concurrency not executed.');
        }
        $process = proc_open([PHP_BINARY, __DIR__.'/../provider-race-worker.php'], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
        $this->assertIsResource($process);
        $config = DB::connection()->getConfig();
        fwrite($pipes[0], json_encode(['connection' => array_intersect_key($config, array_flip(['host', 'port', 'database', 'username', 'password'])), 'operation' => $operation]).PHP_EOL);
        fclose($pipes[0]);
        $this->assertSame("attempting\n", fgets($pipes[1]));
        usleep(100000);
        $this->assertTrue(proc_get_status($process)['running'], 'Concurrent insert must still be waiting while the parent lock is held.');

        return [$process, $pipes];
    }

    public function test_concurrent_association_cannot_survive_provider_deletion(): void
    {
        $id = $this->provider();
        $service = DB::table('services')->where('slug', 'bank-csp')->value('id');
        DB::beginTransaction();
        DB::table('providers')->where('id', $id)->lockForUpdate()->first();
        [$process, $pipes] = $this->worker(['type' => 'associate', 'provider_id' => $id, 'service_id' => $service]);
        $this->deleteJson('/api/admin/providers/'.$id)->assertOk();
        DB::commit();
        $result = json_decode(stream_get_contents($pipes[1]), true);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);
        $this->assertSame('rejected', $result['outcome']);
        $this->assertSame('23000', $result['sql_state']);
        $this->assertDatabaseMissing('providers', ['id' => $id]);
        $this->assertDatabaseMissing('bank_service_details', ['provider_id' => $id]);
    }

    public function test_concurrent_duplicate_insert_is_rejected_by_database(): void
    {
        DB::beginTransaction();
        DB::table('providers')->insert(['name' => 'Synthetic race provider', 'code' => 'QA_RACE', 'is_active' => true, 'sort_order' => 0]);
        [$process, $pipes] = $this->worker(['type' => 'create']);
        DB::commit();
        $result = json_decode(stream_get_contents($pipes[1]), true);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);
        $this->assertSame('rejected', $result['outcome']);
        $this->assertSame(1062, $result['driver_code']);
        $this->assertSame(1, DB::table('providers')->where('code', 'QA_RACE')->count());
    }
}
