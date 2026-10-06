<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminCmsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        $u = User::factory()->create();
        $u->forceFill(['is_admin' => true])->save();
        $this->actingAs($u);
    }

    private function payload(): array
    {
        return ['title' => 'QA Service', 'slug' => 'qa-service', 'category_id' => DB::table('categories')->value('id'), 'short_description' => 'Fictional service summary', 'description' => 'Plain text overview', 'icon' => 'code', 'hero_image' => null, 'icon_path' => null, 'cta_text' => 'Contact the team', 'is_published' => false, 'featured' => false, 'sort_order' => 2, 'seo_title' => null, 'seo_description' => null, 'sections' => [], 'items' => [], 'fees' => [], 'providers' => [], 'faqs' => []];
    }

    public function test_dashboard_reports_real_catalogue_counts(): void
    {
        $this->getJson('/api/admin/dashboard')->assertOk()->assertJsonPath('data.total_services', 32)->assertJsonPath('data.published_services', 32)->assertJsonPath('data.draft_services', 0)->assertJsonPath('data.categories', 5)->assertJsonPath('data.active_providers', 8)->assertDontSee('enquiries');
    }

    public function test_create_draft_publish_and_unpublish_preserve_public_contract(): void
    {
        $r = $this->postJson('/api/admin/services', $this->payload())->assertOk();
        $id = $r->json('data.id');
        $this->getJson('/api/services/qa-service')->assertNotFound();
        $this->getJson('/api/admin/services/'.$id)->assertOk();
        $this->patchJson('/api/admin/services/'.$id.'/publication', ['is_published' => true])->assertOk();
        $this->getJson('/api/services/qa-service')->assertOk()->assertJsonPath('data.title', 'QA Service')->assertDontSee('updated_at');
        $this->patchJson('/api/admin/services/'.$id.'/publication', ['is_published' => false])->assertOk();
        $this->getJson('/api/services/qa-service')->assertNotFound();
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'entity_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'published', 'entity_id' => $id]);
    }

    public function test_complex_service_content_updates_atomically_and_supports_removal_order(): void
    {
        $s = Service::where('slug', 'retailer-id')->firstOrFail();
        $v = $this->getJson('/api/admin/services/'.$s->id)->json('data');
        $v['title'] = 'Updated retailer';
        $v['items'] = [['kind' => 'document', 'label' => 'Second', 'body' => 'Optional text', 'is_required' => false], ['kind' => 'document', 'label' => 'First', 'body' => null, 'is_required' => true]];
        $v['sections'] = [['title' => 'Processing information', 'body' => 'Ask for confirmed information']];
        $v['fees'] = [['label' => 'Confirmed fee', 'amount_paise' => 12345, 'currency' => 'INR', 'notes' => 'Fictional test only', 'is_verified' => true, 'is_active' => true]];
        $v['faqs'] = [['question' => 'Updated question?', 'answer' => 'Updated answer', 'is_active' => true]];
        $this->putJson('/api/admin/services/'.$s->id, $v)->assertOk();
        $this->getJson('/api/services/retailer-id')->assertOk()->assertJsonPath('data.title', 'Updated retailer')->assertJsonPath('data.items.0.label', 'Second')->assertJsonPath('data.items.0.is_required', false)->assertJsonCount(2, 'data.items')->assertJsonPath('data.fees.0.amount_paise', 12345)->assertJsonCount(1, 'data.sections')->assertJsonCount(1, 'data.faqs');
        $v['items'][1]['label'] = 'Second';
        $this->putJson('/api/admin/services/'.$s->id, $v)->assertUnprocessable();
        $this->assertDatabaseCount('service_content_items', 43);
    }

    public function test_service_validation_slug_uniqueness_and_immutable_slug(): void
    {
        $v = $this->payload();
        $v['slug'] = 'bank-csp';
        $this->postJson('/api/admin/services', $v)->assertUnprocessable()->assertJsonValidationErrors('slug');
        $s = Service::where('slug', 'bank-csp')->firstOrFail();
        $v = $this->getJson('/api/admin/services/'.$s->id)->json('data');
        $v['slug'] = 'changed-slug';
        $this->putJson('/api/admin/services/'.$s->id, $v)->assertUnprocessable();
        $this->getJson('/api/services/bank-csp')->assertOk();
        $v = $this->payload();
        $v['category_id'] = 999999;
        $v['sort_order'] = -1;
        $v['hero_image'] = '../../private';
        $this->postJson('/api/admin/services', $v)->assertUnprocessable()->assertJsonValidationErrors(['category_id', 'sort_order', 'hero_image']);
    }

    public function test_admin_search_filters_and_id_tampering(): void
    {
        $this->getJson('/api/admin/services?search=Website&publication=published')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/services?publication=secret')->assertUnprocessable();
        $this->getJson('/api/admin/services/999999')->assertNotFound();
        $this->patchJson('/api/admin/services/999999/publication', ['is_published' => true])->assertNotFound();
    }

    public function test_category_crud_order_disable_and_slug_lock(): void
    {
        $v = ['name' => 'New category', 'slug' => 'new-category', 'summary' => 'Summary', 'icon' => 'code', 'sort_order' => 3, 'is_active' => true, 'seo_title' => 'SEO title', 'seo_description' => 'SEO description'];
        $r = $this->postJson('/api/admin/categories', $v)->assertOk();
        $id = $r->json('data.id');
        $v['slug'] = 'changed';
        $this->putJson('/api/admin/categories/'.$id, $v)->assertUnprocessable();
        $c = DB::table('categories')->where('slug', 'software-it')->first();
        $v = (array) $c;
        $v['is_active'] = false;
        $this->putJson('/api/admin/categories/'.$c->id, $v)->assertOk();
        $this->getJson('/api/services/website-development')->assertNotFound();
        $this->getJson('/api/site')->assertDontSee('software-it');
    }

    public function test_provider_creation_update_and_inactive_public_exclusion(): void
    {
        $v = ['name' => 'Fictional provider', 'code' => 'QA', 'description' => 'Information only', 'logo_path' => null, 'is_active' => true, 'sort_order' => 9];
        $this->postJson('/api/admin/providers', $v)->assertOk();
        $p = DB::table('providers')->where('code', 'SBI')->first();
        $v = (array) $p;
        $v['is_active'] = false;
        $this->putJson('/api/admin/providers/'.$p->id, $v)->assertOk();
        $this->getJson('/api/services/bank-csp')->assertJsonCount(7, 'data.providers')->assertDontSee('"SBI"');
    }

    public function test_provider_specific_content_and_inactive_fees_faqs_do_not_leak(): void
    {
        $s = Service::where('slug', 'bank-csp')->firstOrFail();
        $v = $this->getJson('/api/admin/services/'.$s->id)->json('data');
        $v['providers'][0]['eligibility_overrides'] = ['Confirmed test requirement'];
        $v['providers'][0]['notes'] = 'Safe test note';
        $v['fees'] = [['label' => 'Hidden fee', 'amount_paise' => 100, 'currency' => 'INR', 'is_verified' => true, 'is_active' => false, 'notes' => null]];
        $v['faqs'] = [['question' => 'Hidden question', 'answer' => 'Private draft answer', 'is_active' => false]];
        $this->putJson('/api/admin/services/'.$s->id, $v)->assertOk();
        $this->getJson('/api/services/bank-csp')->assertJsonPath('data.providers.0.eligibility.0', 'Confirmed test requirement')->assertJsonPath('data.providers.0.notes', 'Safe test note')->assertJsonCount(0, 'data.fees')->assertJsonCount(0, 'data.faqs');
    }

    public function test_global_and_service_faq_management(): void
    {
        $v = ['question' => 'QA question?', 'answer' => 'Text answer', 'service_id' => null, 'is_active' => true, 'sort_order' => 0];
        $r = $this->postJson('/api/admin/faqs', $v)->assertOk();
        $id = $r->json('data.id');
        $this->getJson('/api/site')->assertSee('QA question');
        $v['is_active'] = false;
        $this->putJson('/api/admin/faqs/'.$id, $v)->assertOk();
        $this->getJson('/api/site')->assertDontSee('QA question');
        $v['is_active'] = true;
        $v['service_id'] = Service::where('slug', 'aeps')->value('id');
        $this->putJson('/api/admin/faqs/'.$id, $v)->assertOk();
        $this->getJson('/api/site')->assertDontSee('QA question');
        $this->getJson('/api/services/aeps')->assertSee('QA question');
    }

    public function test_settings_update_validation_and_secret_exclusion(): void
    {
        $v = ['company_name' => 'QA Company', 'phone' => '+91 90000 00000', 'email' => 'qa@example.test', 'footer' => 'Information only', 'seo_title' => 'QA', 'seo_description' => 'Summary', 'facebook' => 'https://www.facebook.com/example'];
        $this->putJson('/api/admin/settings', $v)->assertOk();
        $this->getJson('/api/site')->assertJsonPath('data.settings.phone', '+91 90000 00000');
        $v['GEMINI_API_KEY'] = 'never-store';
        $this->putJson('/api/admin/settings', $v)->assertUnprocessable();
        unset($v['GEMINI_API_KEY']);
        $v['facebook'] = 'javascript:alert(1)';
        $this->putJson('/api/admin/settings', $v)->assertUnprocessable();
        $v['facebook'] = 'https://www.facebook.com/example';
        $v['phone'] = '--------';
        $this->putJson('/api/admin/settings', $v)->assertUnprocessable()->assertJsonValidationErrors('phone');
        DB::table('site_settings')->insert(['key' => 'ADMIN_PASSWORD', 'value' => 'hidden-secret', 'is_public' => true]);
        $this->getJson('/api/site')->assertDontSee('hidden-secret');
        $this->getJson('/api/admin/settings')->assertDontSee('hidden-secret');
    }

    public function test_plain_text_xss_content_and_audit_data_minimization(): void
    {
        $v = $this->payload();
        $v['description'] = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
        $v['is_published'] = true;
        $r = $this->postJson('/api/admin/services', $v)->assertOk();
        $this->getJson('/api/services/qa-service')->assertJsonPath('data.description', $v['description']);
        $log = json_encode(DB::table('audit_logs')->get());
        $this->assertStringNotContainsString('onerror', $log);
        $this->assertStringNotContainsString('password', $log);
        $this->getJson('/api/admin/audit-logs?entity_type=service')->assertOk()->assertDontSee('remember_token');
        $this->postJson('/api/admin/audit-logs', [])->assertStatus(405);
    }

    public function test_missing_and_malformed_nested_content_is_rejected_without_changes(): void
    {
        $v = $this->payload();
        $v['items'] = 'not-an-array';
        $this->postJson('/api/admin/services', $v)->assertUnprocessable();
        $v = $this->payload();
        $v['fees'] = [['label' => 'bad', 'amount_paise' => 1.5, 'currency' => 'USD', 'is_verified' => true, 'is_active' => true]];
        $this->postJson('/api/admin/services', $v)->assertUnprocessable();
        $this->assertDatabaseCount('services', 32);
    }
}
