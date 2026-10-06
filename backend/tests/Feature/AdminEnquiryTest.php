<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use App\Services\EnquiryWorkflow;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminEnquiryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(CatalogueSeeder::class);
    }

    private function createEnquiry(string $message = 'Please confirm the current requirements.'): string
    {
        return EnquiryWorkflow::submit(['name' => 'Fictional visitor', 'mobile' => '9000000000', 'email' => 'fictional@example.test', 'state' => 'West Bengal', 'city' => 'Kolkata',
            'service_id' => Service::where('slug', 'bank-csp')->value('id'), 'message' => $message, 'source_path' => '/services/bank-csp']);
    }

    private function administrator(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();
        $this->actingAs($user);

        return $user;
    }

    public function test_anonymous_and_non_admin_users_cannot_read_or_write_leads(): void
    {
        $reference = $this->createEnquiry();
        foreach ([['GET', '/api/admin/enquiries'], ['GET', '/api/admin/enquiries/'.$reference], ['PATCH', '/api/admin/enquiries/'.$reference.'/status'], ['POST', '/api/admin/enquiries/'.$reference.'/notes']] as [$method, $path]) {
            $this->json($method, $path)->assertUnauthorized()->assertDontSee('fictional@example.test');
        }
        $this->actingAs(User::factory()->create());
        foreach ([['GET', '/api/admin/enquiries'], ['GET', '/api/admin/enquiries/'.$reference], ['PATCH', '/api/admin/enquiries/'.$reference.'/status'], ['POST', '/api/admin/enquiries/'.$reference.'/notes']] as [$method, $path]) {
            $this->json($method, $path)->assertForbidden();
        }
        $this->assertDatabaseCount('enquiry_notes', 0);
        $this->assertDatabaseCount('enquiry_status_history', 1);
    }

    public function test_admin_list_and_detail_minimize_data_and_audit_read_without_contact_values(): void
    {
        $reference = $this->createEnquiry();
        $this->administrator();
        $this->getJson('/api/admin/enquiries')->assertOk()->assertJsonPath('data.data.0.reference', $reference)->assertJsonPath('data.data.0.service_title', 'Bank CSP')->assertDontSee('fingerprint')->assertDontSee('Please confirm');
        $this->getJson('/api/admin/enquiries/'.$reference)->assertOk()->assertJsonPath('data.mobile', '9000000000')->assertJsonPath('data.history.0.status', 'NEW')->assertJsonPath('data.source_path', '/services/bank-csp')->assertDontSee('fingerprint')->assertDontSee('enquiry_id');
        $audit = DB::table('audit_logs')->first();
        $this->assertSame('viewed', $audit->action);
        $this->assertSame('Enquiry viewed', $audit->summary);
        $this->assertStringNotContainsString('fictional', json_encode($audit));
    }

    public function test_status_workflow_keeps_initial_and_each_change_with_actor_optional_note(): void
    {
        $reference = $this->createEnquiry();
        $user = $this->administrator();
        $this->patchJson('/api/admin/enquiries/'.$reference.'/status', ['status' => 'CONTACTED', 'expected_status' => 'NEW', 'note' => 'Called fictional visitor'])->assertOk();
        $this->patchJson('/api/admin/enquiries/'.$reference.'/status', ['status' => 'FOLLOW_UP', 'expected_status' => 'CONTACTED'])->assertOk();
        $this->assertDatabaseCount('enquiry_status_history', 3);
        $this->assertDatabaseHas('enquiries', ['reference' => $reference, 'status' => 'FOLLOW_UP']);
        $this->assertDatabaseHas('enquiry_status_history', ['from_status' => 'NEW', 'status' => 'CONTACTED', 'changed_by' => $user->id, 'note' => 'Called fictional visitor']);
        $this->getJson('/api/admin/enquiries/'.$reference)->assertJsonPath('data.history.0.status', 'FOLLOW_UP')->assertJsonPath('data.history.1.status', 'CONTACTED')->assertJsonPath('data.history.2.status', 'NEW');
        $this->assertSame(2, DB::table('audit_logs')->where('action', 'status_changed')->count());
    }

    public function test_stale_or_repeated_status_updates_are_rejected_without_history_writes(): void
    {
        $reference = $this->createEnquiry();
        $this->administrator();
        $path = '/api/admin/enquiries/'.$reference.'/status';
        $this->patchJson($path, ['status' => 'CONTACTED', 'expected_status' => 'NEW'])->assertOk();
        $this->patchJson($path, ['status' => 'QUALIFIED', 'expected_status' => 'NEW'])->assertConflict();
        $this->patchJson($path, ['status' => 'CONTACTED', 'expected_status' => 'CONTACTED'])->assertUnprocessable();
        $this->patchJson($path, ['status' => 'BAD', 'expected_status' => 'CONTACTED'])->assertUnprocessable();
        $this->assertDatabaseCount('enquiry_status_history', 2);
    }

    public function test_all_allowed_states_and_reopening_are_recorded(): void
    {
        $reference = $this->createEnquiry();
        $this->administrator();
        $previous = 'NEW';
        foreach (['QUALIFIED', 'CONVERTED', 'CLOSED', 'NEW'] as $status) {
            $this->patchJson('/api/admin/enquiries/'.$reference.'/status', ['status' => $status, 'expected_status' => $previous])->assertOk();
            $previous = $status;
        }
        $this->assertDatabaseCount('enquiry_status_history', 5);
    }

    public function test_internal_notes_are_append_only_and_excluded_from_audit_and_public_reads(): void
    {
        $reference = $this->createEnquiry();
        $user = $this->administrator();
        $body = '<img src=x onerror="alert(1)"> private plain-text note';
        $this->postJson('/api/admin/enquiries/'.$reference.'/notes', ['body' => $body])->assertOk();
        $this->assertDatabaseHas('enquiry_notes', ['body' => $body, 'administrator_id' => $user->id]);
        $this->getJson('/api/admin/enquiries/'.$reference)->assertJsonPath('data.notes.0.body', $body);
        $this->getJson('/api/admin/audit-logs?entity_type=enquiry')->assertOk()->assertDontSee('private plain-text note')->assertDontSee('fictional@example.test');
        $this->getJson('/api/site')->assertDontSee('private plain-text note');
        $this->postJson('/api/admin/enquiries/'.$reference.'/notes', ['body' => str_repeat('a', 3001)])->assertUnprocessable();
        $this->postJson('/api/admin/enquiries/'.$reference.'/notes', ['body' => ''])->assertUnprocessable();
        $this->assertDatabaseCount('enquiry_notes', 1);
    }

    public function test_filters_search_dates_newest_order_and_pagination(): void
    {
        $first = $this->createEnquiry('First fictional enquiry message');
        $second = $this->createEnquiry('Second fictional enquiry message');
        DB::table('enquiries')->where('reference', $first)->update(['created_at' => '2026-01-02 10:00:00', 'status' => 'CLOSED']);
        DB::table('enquiries')->where('reference', $second)->update(['created_at' => '2026-02-02 10:00:00']);
        $this->administrator();
        $this->getJson('/api/admin/enquiries')->assertJsonPath('data.data.0.reference', $second)->assertJsonPath('data.total', 2);
        $this->getJson('/api/admin/enquiries?status=CLOSED')->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.reference', $first);
        $this->getJson('/api/admin/enquiries?from=2026-02-02&to=2026-02-02')->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.reference', $second);
        $this->getJson('/api/admin/enquiries?to=2026-01-02')->assertOk()->assertJsonPath('data.total', 1);
        $this->getJson('/api/admin/enquiries?search='.urlencode($second))->assertJsonPath('data.total', 1);
        $this->getJson('/api/admin/enquiries?search=fictional%40example.test')->assertJsonPath('data.total', 2);
        $this->getJson('/api/admin/enquiries?search=%25')->assertJsonPath('data.total', 0);
        $serviceId = Service::where('slug', 'aeps')->value('id');
        $this->getJson('/api/admin/enquiries?service_id='.$serviceId)->assertJsonPath('data.total', 0);
        $this->getJson('/api/admin/enquiries?page=2')->assertJsonCount(0, 'data.data');
    }

    public function test_filter_reference_and_source_tampering_are_rejected(): void
    {
        $reference = $this->createEnquiry();
        $this->administrator();
        foreach (['status=BAD', 'service_id=999999', 'from=invalid', 'from=2026-02-02&to=2026-01-01', 'page=0', 'include=secrets'] as $query) {
            $this->getJson('/api/admin/enquiries?'.$query)->assertUnprocessable();
        }
        $this->getJson('/api/admin/enquiries/GL-00000000000000000000000000')->assertNotFound();
        $this->getJson('/api/admin/enquiries/1')->assertNotFound();
        $this->patchJson('/api/admin/enquiries/GL-00000000000000000000000000/status', ['status' => 'CLOSED', 'expected_status' => 'NEW'])->assertNotFound();
        $this->assertDatabaseHas('enquiries', ['reference' => $reference, 'status' => 'NEW']);
    }

    public function test_historical_leads_survive_service_unpublication_and_dashboard_counts_are_real(): void
    {
        $reference = $this->createEnquiry();
        Service::where('slug', 'bank-csp')->update(['is_published' => false]);
        $this->administrator();
        $this->getJson('/api/admin/enquiries/'.$reference)->assertOk()->assertJsonPath('data.service_title', 'Bank CSP');
        $this->getJson('/api/admin/dashboard')->assertJsonPath('data.lead_counts.NEW', 1)->assertJsonPath('data.lead_counts.CONVERTED', 0);
        $this->patchJson('/api/admin/enquiries/'.$reference.'/status', ['status' => 'FOLLOW_UP', 'expected_status' => 'NEW'])->assertOk();
        $this->getJson('/api/admin/dashboard')->assertJsonPath('data.lead_counts.NEW', 0)->assertJsonPath('data.lead_counts.FOLLOW_UP', 1);
    }
}
