<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Service;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicCatalogueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
    }

    public function test_seed_catalogue_has_requested_records_and_no_default_users(): void
    {
        $this->assertDatabaseCount('categories', 5);
        $this->assertDatabaseCount('services', 32);
        $this->assertDatabaseCount('providers', 8);
        $this->assertDatabaseCount('service_fees', 0);
        $this->assertDatabaseCount('users', 0);
        $this->getJson('/api/services')->assertOk()->assertJsonCount(32, 'data');
    }

    public function test_seed_is_idempotent_and_preserves_edited_content(): void
    {
        DB::table('site_settings')->where('key', 'phone')->update(['value' => 'edited']);
        $faqId = DB::table('faqs')->orderBy('id')->value('id');
        DB::table('faqs')->where('id', $faqId)->update(['answer' => 'edited FAQ']);
        $this->seed(CatalogueSeeder::class);
        $this->assertDatabaseCount('services', 32);
        $this->assertDatabaseCount('providers', 8);
        $this->assertDatabaseCount('faqs', 4);
        $this->assertDatabaseCount('service_content_items', 52);
        $this->assertDatabaseHas('site_settings', ['key' => 'phone', 'value' => 'edited']);
        $this->assertDatabaseHas('faqs', ['id' => $faqId, 'answer' => 'edited FAQ']);
    }

    public function test_public_settings_exclude_secrets_even_if_marked_public(): void
    {
        DB::table('site_settings')->insert(['key' => 'GEMINI_API_KEY', 'value' => 'private-test-key', 'is_public' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->getJson('/api/site')->assertOk()->assertJsonPath('data.settings.phone', '+91 62931 37235')->assertJsonCount(5, 'data.categories')->assertJsonCount(4, 'data.faqs')->assertDontSee('private-test-key')->assertDontSee('GEMINI_API_KEY');
    }

    public function test_unpublished_service_and_inactive_category_are_hidden(): void
    {
        $s = Service::factory()->create(['is_published' => false]);
        $this->getJson('/api/services/'.$s->slug)->assertNotFound();
        $this->getJson('/api/services')->assertDontSee($s->slug);
        $c = Category::factory()->create(['is_active' => false]);
        $s = Service::factory()->create(['category_id' => $c->id]);
        $this->getJson('/api/services/'.$s->slug)->assertNotFound();
        $this->getJson('/api/site')->assertDontSee($c->slug);
    }

    public function test_category_filter_and_stable_order(): void
    {
        $r = $this->getJson('/api/services?category=software-it')->assertOk()->assertJsonCount(6, 'data');
        $r->assertJsonPath('data.0.slug', 'website-development');
        foreach ($r->json('data') as $s) {
            $this->assertSame('software-it', $s['category']['slug']);
        }
        $this->getJson('/api/services?category=unknown')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_sql_and_unknown_filter_inputs_are_rejected(): void
    {
        $this->getJson('/api/services?category='.urlencode("x' OR 1=1 --"))->assertUnprocessable();
        $this->getJson('/api/services?is_published=0')->assertUnprocessable();
        $this->getJson('/api/services/not-existing')->assertNotFound();
        $this->assertDatabaseCount('services', 32);
    }

    public function test_csp_is_structured_with_editable_labels_and_no_invented_fees(): void
    {
        $r = $this->getJson('/api/services/bank-csp')->assertOk()->assertJsonCount(8, 'data.providers')->assertJsonCount(0, 'data.fees')->assertJsonPath('data.providers.0.name', 'SBI')->assertJsonPath('data.providers.0.fee_information', null);
        $r->assertSee('No guaranteed approval');
        $this->assertArrayNotHasKey('is_published', $r->json('data'));
        $this->assertArrayNotHasKey('password', $r->json('data'));
    }

    public function test_inactive_provider_is_omitted_and_verified_fee_only_is_public(): void
    {
        DB::table('providers')->where('code', 'SBI')->update(['is_active' => false]);
        $id = Service::where('slug', 'bank-csp')->value('id');
        foreach ([false, true] as $verified) {
            DB::table('service_fees')->insert(['service_id' => $id, 'label' => $verified ? 'Confirmed fee' : 'Unverified fee', 'amount_paise' => 100001, 'currency' => 'INR', 'is_verified' => $verified, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->getJson('/api/services/bank-csp')->assertOk()->assertJsonCount(7, 'data.providers')->assertJsonCount(1, 'data.fees')->assertJsonPath('data.fees.0.amount_paise', 100001)->assertDontSee('Unverified fee');
    }

    public function test_retailer_and_distributor_document_checklists_are_database_driven(): void
    {
        foreach (['retailer-id', 'distributor-id'] as $slug) {
            $r = $this->getJson('/api/services/'.$slug)->assertOk();
            $this->assertCount(10, array_filter($r->json('data.items'), fn ($i) => $i['kind'] === 'document'));
            $r->assertSee('GPS Map Camera picture');
        }
        $id = Service::where('slug', 'retailer-id')->value('id');
        DB::table('service_content_items')->where('service_id', $id)->where('kind', 'document')->delete();
        $this->getJson('/api/services/retailer-id')->assertOk()->assertDontSee('GPS Map Camera picture');
    }

    public function test_api_is_read_only_and_no_future_admin_chat_or_enquiry_route_exists(): void
    {
        foreach (['/api/services', '/api/chat', '/api/enquiries', '/api/admin/services'] as $path) {
            $this->postJson($path, [])->assertStatus($path === '/api/services' ? 405 : 404);
        }
        $this->assertDatabaseCount('users', 0);
    }

    public function test_public_throttling_and_security_headers(): void
    {
        $this->getJson('/api/site')->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY');
        for ($i = 0; $i < 90; $i++) {
            $r = $this->getJson('/api/site');
        }
        $r->assertStatus(429);
    }

    public function test_production_fails_closed_for_http_or_debug_mode(): void
    {
        $this->app['env'] = 'production';
        config(['app.debug' => false]);
        $this->getJson('/api/site')->assertStatus(503)->assertDontSee('DB_PASSWORD');
        config(['app.debug' => true]);
        $this->withServerVariables(['HTTPS' => 'on'])->getJson('/api/site')->assertStatus(503);
    }

    public function test_database_content_is_text_and_not_silently_stripped_or_executed_by_api(): void
    {
        $s = Service::factory()->create(['description' => '<script>alert(1)</script>']);
        $this->getJson('/api/services/'.$s->slug)->assertOk()->assertJsonPath('data.description', '<script>alert(1)</script>');
    }
}
