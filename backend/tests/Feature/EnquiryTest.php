<?php

namespace Tests\Feature;

use App\Models\Service;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EnquiryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(CatalogueSeeder::class);
    }

    private function payload(): array
    {
        return ['name' => 'Fictional visitor', 'mobile' => '9000000000', 'email' => null, 'state' => 'West Bengal', 'city' => 'Kolkata',
            'service_id' => Service::where('slug', 'bank-csp')->value('id'), 'source_path' => '/services/bank-csp',
            'message' => 'Please confirm current service requirements.', 'consent' => true, 'website' => ''];
    }

    public function test_public_creation_returns_only_reference_and_stores_initial_history_consent(): void
    {
        $values = $this->payload();
        $values['mobile'] = '+91 9000000000';
        $values['status'] = 'CONVERTED';
        $values['created_at'] = '2000-01-01';
        $response = $this->postJson('/api/enquiries', $values)->assertCreated()->assertJsonStructure(['data' => ['reference', 'message']]);
        $this->assertMatchesRegularExpression('/^GL-[0-9A-HJKMNP-TV-Z]{26}$/', $response->json('data.reference'));
        $this->assertSame(['reference', 'message'], array_keys($response->json('data')));
        $this->assertDatabaseHas('enquiries', ['reference' => $response->json('data.reference'), 'mobile' => '9000000000', 'status' => 'NEW', 'consent_version' => 'contact-enquiry-v1']);
        $this->assertDatabaseHas('enquiry_status_history', ['status' => 'NEW', 'changed_by' => null]);
        $this->assertNotNull(DB::table('enquiries')->value('consented_at'));
        $this->assertStringNotContainsString('2000-01-01', DB::table('enquiries')->value('created_at'));
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_required_fields_consent_and_bounds_are_enforced_without_writes(): void
    {
        $this->postJson('/api/enquiries', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'mobile', 'service_id', 'consent', 'source_path']);
        $values = $this->payload();
        $values['consent'] = false;
        $values['mobile'] = '123';
        $values['email'] = 'not-email';
        $values['message'] = str_repeat('a', 3001);
        $this->postJson('/api/enquiries', $values)->assertUnprocessable()->assertJsonValidationErrors(['mobile', 'email', 'message', 'consent']);
        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_honeypot_and_unsafe_control_text_are_rejected(): void
    {
        $values = $this->payload();
        $values['website'] = 'https://spam.test';
        $this->postJson('/api/enquiries', $values)->assertUnprocessable()->assertJsonValidationErrors('website');
        $values['website'] = '';
        $values['message'] = "Unsafe\0 message control";
        $this->postJson('/api/enquiries', $values)->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_invalid_unpublished_and_inactive_category_services_cannot_receive_enquiries(): void
    {
        $values = $this->payload();
        $values['service_id'] = 999999;
        $this->postJson('/api/enquiries', $values)->assertUnprocessable();
        $service = Service::where('slug', 'bank-csp')->firstOrFail();
        $values['service_id'] = $service->id;
        $service->update(['is_published' => false]);
        $this->postJson('/api/enquiries', $values)->assertUnprocessable();
        $service->update(['is_published' => true]);
        DB::table('categories')->where('id', $service->category_id)->update(['is_active' => false]);
        $this->postJson('/api/enquiries', $values)->assertUnprocessable();
        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_source_path_is_allowlisted_and_service_matched(): void
    {
        $values = $this->payload();
        foreach (['https://evil.test/', '/services/aeps', '/admin/enquiries'] as $source) {
            $values['source_path'] = $source;
            $this->postJson('/api/enquiries', $values)->assertUnprocessable()->assertJsonValidationErrors('source_path');
        }
        $values['source_path'] = '/';
        $this->postJson('/api/enquiries', $values)->assertCreated();
    }

    public function test_duplicate_rejection_preserves_single_lead_and_history(): void
    {
        $this->postJson('/api/enquiries', $this->payload())->assertCreated();
        $this->postJson('/api/enquiries', $this->payload())->assertConflict();
        $this->assertDatabaseCount('enquiries', 1);
        $this->assertDatabaseCount('enquiry_status_history', 1);
    }

    public function test_phone_limit_applies_across_distinct_messages(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $values = $this->payload();
            $values['message'] .= ' Request '.$i;
            $this->postJson('/api/enquiries', $values)->assertCreated();
        }
        $values['message'] .= ' Final';
        $this->postJson('/api/enquiries', $values)->assertTooManyRequests();
        $this->assertDatabaseCount('enquiries', 3);
    }

    public function test_ip_rate_limit_counts_invalid_requests(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/enquiries', [])->assertUnprocessable();
        }
        $this->postJson('/api/enquiries', [])->assertTooManyRequests();
    }

    public function test_no_public_read_or_mutation_by_reference_exists(): void
    {
        $reference = $this->postJson('/api/enquiries', $this->payload())->json('data.reference');
        $this->getJson('/api/enquiries')->assertMethodNotAllowed();
        $this->getJson('/api/enquiries/'.$reference)->assertNotFound();
        $this->patchJson('/api/enquiries/'.$reference, ['status' => 'CONVERTED'])->assertNotFound();
        $this->getJson('/api/site')->assertDontSee('Fictional visitor')->assertDontSee('9000000000');
    }

    public function test_hourly_limit_survives_the_minute_window_and_mobiles_are_not_silently_cleaned_of_letters(): void
    {
        $values = $this->payload();
        $values['mobile'] = 'abc9000000000';
        $this->postJson('/api/enquiries', $values)->assertUnprocessable()->assertJsonValidationErrors('mobile');
        Cache::flush();
        for ($i = 0; $i < 20; $i++) {
            if ($i && $i % 5 === 0) {
                $this->travel(61)->seconds();
            }
            $values['mobile'] = '9'.str_pad((string) $i, 9, '0', STR_PAD_LEFT);
            $this->postJson('/api/enquiries', $values)->assertCreated();
        }
        $this->travel(61)->seconds();
        $this->postJson('/api/enquiries', $values)->assertTooManyRequests();
        $this->assertDatabaseCount('enquiries', 20);
        $this->travelBack();
    }

    public function test_real_web_csrf_rejects_missing_token_and_accepts_matching_session(): void
    {
        $this->app['env'] = 'local';
        $this->postJson('/api/enquiries', $this->payload())->assertStatus(419);
        $token = $this->getJson('/api/enquiries/session')->assertOk()->json('data.csrf_token');
        $this->withSession(['_token' => $token])->withHeader('X-CSRF-TOKEN', $token)->postJson('/api/enquiries', $this->payload())->assertCreated();
    }
}
