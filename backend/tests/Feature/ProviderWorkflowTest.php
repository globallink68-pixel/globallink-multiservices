<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProviderDeletionSafety;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProviderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        $administrator = User::factory()->create();
        $administrator->forceFill(['is_admin' => true])->save();
        $this->actingAs($administrator);
        config(['provider_workflow.permanent_delete_enabled' => true]);
        $safety = \Mockery::mock(ProviderDeletionSafety::class)->makePartial();
        $safety->shouldReceive('metadataVisibilityIsComplete')->andReturn(true);
        $this->app->instance(ProviderDeletionSafety::class, $safety);
    }

    private function payload(array $overrides = []): array
    {
        return array_replace(['name' => 'Fictional test provider', 'code' => 'QA_NEW', 'description' => null, 'logo_path' => null, 'is_active' => true, 'sort_order' => 8], $overrides);
    }

    private function servicePayload(string $slug = 'bank-csp'): array
    {
        $id = DB::table('services')->where('slug', $slug)->value('id');

        return $this->getJson('/api/admin/services/'.$id)->assertOk()->json('data');
    }

    private function association(int $id): array
    {
        return ['provider_id' => $id, 'description' => 'Service-specific test information', 'eligibility_overrides' => [], 'document_overrides' => [], 'fee_information' => null, 'processing_notes' => null, 'notes' => null, 'disclaimer' => null];
    }

    public function test_creation_normalization_persistence_order_and_repeated_code(): void
    {
        $id = $this->postJson('/api/admin/providers', $this->payload(['code' => ' qa_new ']))->assertOk()->assertJsonPath('data.code', 'QA_NEW')->json('data.id');
        $this->assertDatabaseHas('providers', ['id' => $id, 'code' => 'QA_NEW', 'is_active' => 1]);
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'provider', 'entity_id' => $id, 'action' => 'saved']);
        $this->getJson('/api/admin/providers')->assertOk()->assertJsonFragment(['id' => $id]);
        $this->assertDatabaseMissing('bank_service_details', ['provider_id' => $id]);
        $this->postJson('/api/admin/providers', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertSame(1, DB::table('providers')->where('code', 'QA_NEW')->count());
        $this->putJson('/api/admin/providers/'.$id, $this->payload(['name' => 'Edited test provider', 'is_active' => false]))->assertOk();
        $this->postJson('/api/admin/providers', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('code');
        $second = $this->postJson('/api/admin/providers', $this->payload(['code' => 'QA_SECOND']))->assertOk()->json('data.id');
        $ids = collect($this->getJson('/api/admin/providers')->json('data'))->where('sort_order', 8)->pluck('id')->all();
        $this->assertSame([$id, $second], $ids);
        $this->assertDatabaseHas('providers', ['id' => $id, 'name' => 'Edited test provider', 'is_active' => 0]);
    }

    public function test_invalid_fields_reject_without_writes(): void
    {
        foreach ([['name', ''], ['name', str_repeat('x', 121)], ['code', 'bad code'], ['code', str_repeat('X', 41)], ['code', []], ['sort_order', null], ['sort_order', -1], ['sort_order', 10001], ['sort_order', 1.5], ['is_active', 'active'], ['description', str_repeat('x', 5001)], ['logo_path', '/storage/logo.png']] as [$field, $value]) {
            $this->postJson('/api/admin/providers', $this->payload([$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('providers', 8);
        $this->putJson('/api/admin/providers/999999', $this->payload())->assertNotFound();
    }

    public function test_service_association_description_and_idempotent_save(): void
    {
        $id = $this->postJson('/api/admin/providers', $this->payload())->json('data.id');
        $bank = $this->servicePayload();
        $other = $this->servicePayload('retailer-id');
        $other['providers'] = [$this->association($id)];
        $this->putJson('/api/admin/services/'.$other['id'], $other)->assertOk();
        $bank['providers'][] = $this->association($id);
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        }
        $this->assertSame(1, DB::table('bank_service_details')->where('service_id', $bank['id'])->where('provider_id', $id)->count());
        $public = collect($this->getJson('/api/services/bank-csp')->assertOk()->json('data.providers'))->firstWhere('id', $id);
        $this->assertSame('Service-specific test information', $public['service_description']);
        unset($bank['providers'][8]['description']);
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        $this->assertDatabaseHas('bank_service_details', ['service_id' => $bank['id'], 'provider_id' => $id, 'description' => 'Service-specific test information']);
        $bank['providers'][8]['description'] = null;
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        $this->assertDatabaseHas('bank_service_details', ['service_id' => $bank['id'], 'provider_id' => $id, 'description' => null]);
        $bank['providers'][] = $this->association($id);
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertUnprocessable()->assertJsonValidationErrors('providers.8.provider_id');
        $bank['providers'] = array_slice($bank['providers'], 0, 8);
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        $this->assertDatabaseHas('providers', ['id' => $id]);
        $this->assertDatabaseHas('bank_service_details', ['provider_id' => $id, 'service_id' => $other['id']]);
        $this->assertDatabaseMissing('bank_service_details', ['provider_id' => $id, 'service_id' => $bank['id']]);
    }

    public function test_logo_public_access_activation_and_shared_media_survive_delete(): void
    {
        Storage::fake('local');
        $url = $this->postJson('/api/admin/media', ['image' => UploadedFile::fake()->image('fictional.png')])->assertCreated()->json('data.url');
        $id = $this->postJson('/api/admin/providers', $this->payload(['logo_path' => $url]))->assertOk()->json('data.id');
        $this->get($url)->assertNotFound();
        $bank = $this->servicePayload();
        $bank['providers'][] = $this->association($id);
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        $this->get($url)->assertOk();
        $this->getJson('/api/services/bank-csp')->assertJsonFragment(['logo_path' => $url]);
        $this->putJson('/api/admin/providers/'.$id, $this->payload(['logo_path' => $url, 'is_active' => false]))->assertOk();
        $this->getJson('/api/services/bank-csp')->assertDontSee('Fictional test provider');
        $this->get($url)->assertNotFound();
        DB::table('site_settings')->where('key', 'logo')->update(['value' => $url]);
        $bank['providers'] = array_slice($bank['providers'], 0, 8);
        $this->putJson('/api/admin/services/'.$bank['id'], $bank)->assertOk();
        $this->deleteJson('/api/admin/providers/'.$id)->assertOk();
        $this->assertDatabaseCount('media_assets', 1);
        $media = DB::table('media_assets')->first();
        Storage::disk('local')->assertExists($media->path);
        $this->get($url)->assertOk();
    }

    public function test_safe_deletion_conflicts_audit_and_existing_records(): void
    {
        $existing = DB::table('providers')->orderBy('id')->get()->toJson();
        $id = $this->postJson('/api/admin/providers', $this->payload())->json('data.id');
        $this->deleteJson('/api/admin/providers/'.$id)->assertOk()->assertJsonPath('data.message', 'Provider deleted.');
        $this->assertDatabaseMissing('providers', ['id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'provider', 'entity_id' => $id, 'action' => 'deleted']);
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'provider', 'entity_id' => $id, 'action' => 'saved']);
        $this->deleteJson('/api/admin/providers/'.$id)->assertNotFound();
        $associated = DB::table('bank_service_details')->value('provider_id');
        $this->deleteJson('/api/admin/providers/'.$associated)->assertStatus(409)->assertSee('associated');
        $this->assertDatabaseCount('bank_service_details', 8);
        $this->assertSame($existing, DB::table('providers')->orderBy('id')->get()->toJson());
    }

    public function test_create_update_delete_require_authorization(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/admin/providers', $this->payload())->assertUnauthorized();
        $this->putJson('/api/admin/providers/1', $this->payload())->assertUnauthorized();
        $this->deleteJson('/api/admin/providers/1')->assertUnauthorized();
        $this->actingAs(User::factory()->create());
        $this->postJson('/api/admin/providers', $this->payload())->assertForbidden();
        $this->putJson('/api/admin/providers/1', $this->payload())->assertForbidden();
        $this->deleteJson('/api/admin/providers/1')->assertForbidden();
        $this->assertDatabaseCount('providers', 8);
    }

    public function test_audit_failure_rolls_back_creation_and_deletion_without_exposing_sql(): void
    {
        $id = $this->postJson('/api/admin/providers', $this->payload())->json('data.id');
        $this->app['env'] = 'production';
        config(['app.url' => 'https://localhost', 'app.debug' => false]);
        $token = $this->getJson('https://localhost/api/admin/session')->json('data.csrf_token');
        $this->withHeader('X-CSRF-TOKEN', $token);
        $armed = true;
        DB::listen(function (QueryExecuted $query) use (&$armed): void {
            if ($armed && str_starts_with($query->sql, 'insert into `audit_logs`')) {
                $armed = false;
                throw new \RuntimeException('Synthetic private SQL failure');
            }
        });
        $response = $this->postJson('https://localhost/api/admin/providers', $this->payload(['code' => 'QA_ROLLBACK']))->assertStatus(500)->assertJsonPath('message', 'The request could not be completed.')->assertJsonStructure(['request_id']);
        $this->assertSame($response->headers->get('X-Request-ID'), $response->json('request_id'));
        $this->assertDatabaseMissing('providers', ['code' => 'QA_ROLLBACK']);
        $armed = true;
        $this->deleteJson('https://localhost/api/admin/providers/'.$id)->assertStatus(500);
        $this->assertDatabaseHas('providers', ['id' => $id]);
        $this->assertDatabaseMissing('audit_logs', ['entity_type' => 'provider', 'entity_id' => $id, 'action' => 'deleted']);
    }

    public function test_existing_database_constraints_and_foreign_keys(): void
    {
        $indexes = DB::select('SHOW INDEX FROM providers');
        $this->assertTrue(collect($indexes)->contains(fn ($index) => $index->Column_name === 'code' && (int) $index->Non_unique === 0));
        $indexes = collect(DB::select('SHOW INDEX FROM bank_service_details'))->groupBy('Key_name');
        $this->assertTrue($indexes->contains(fn ($index) => $index->pluck('Column_name')->all() === ['service_id', 'provider_id'] && (int) $index->first()->Non_unique === 0));
        $references = DB::select('SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ?', ['providers']);
        $this->assertSame(['bank_service_details'], array_column($references, 'TABLE_NAME'));
    }

    public function test_real_csrf_blocks_provider_writes_and_allows_matching_token(): void
    {
        $this->app['env'] = 'local';
        $this->postJson('/api/admin/providers', $this->payload())->assertStatus(419);
        $this->putJson('/api/admin/providers/1', $this->payload())->assertStatus(419);
        $this->deleteJson('/api/admin/providers/1')->assertStatus(419);
        $this->assertDatabaseCount('providers', 8);
        $token = $this->getJson('/api/admin/session')->json('data.csrf_token');
        $this->withHeader('X-CSRF-TOKEN', $token);
        $id = $this->postJson('/api/admin/providers', $this->payload())->assertOk()->json('data.id');
        $this->deleteJson('/api/admin/providers/'.$id)->assertOk();
    }
}
