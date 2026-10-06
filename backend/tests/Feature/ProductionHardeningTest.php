<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        Cache::flush();
    }

    public function test_success_and_errors_have_security_headers_and_private_responses_never_cache(): void
    {
        foreach (['/api/site' => 200, '/api/admin/enquiries' => 401, '/api/services/absent' => 404, '/api/unknown' => 404] as $path => $status) {
            $r = $this->getJson($path)->assertStatus($status)->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY')->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
            $this->assertStringContainsString("frame-ancestors 'none'", $r->headers->get('Content-Security-Policy'));
            $this->assertStringContainsString('camera=()', $r->headers->get('Permissions-Policy'));
            if ($status !== 200) {
                $r->assertHeader('Cache-Control', 'no-store, private');
            }
        }
        $this->postJson('/api/chat', [])->assertUnprocessable()->assertHeader('Cache-Control', 'no-store, private')->assertHeader('X-Frame-Options', 'DENY');
        $this->getJson('/api/admin/session')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_actual_csrf_errors_are_hardened_and_oversized_requests_cannot_write(): void
    {
        $this->app['env'] = 'local';
        $this->postJson('/api/chat', [])->assertStatus(419)->assertHeader('Content-Security-Policy');
        foreach (['/api/chat' => 16385, '/api/enquiries' => 16385, '/api/admin/services' => 1048577, '/api/admin/media' => 3145729] as $path => $length) {
            $this->call('POST', $path, [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], str_repeat('x', $length))->assertStatus(413)->assertHeader('X-Frame-Options', 'DENY')->assertHeader('Cache-Control', 'no-store, private');
        }
        $this->assertDatabaseCount('enquiries', 0);
        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_production_requires_https_canonical_host_and_debug_disabled(): void
    {
        $this->app['env'] = 'production';
        config(['app.debug' => false, 'app.url' => 'https://www.example.test']);
        $this->getJson('http://www.example.test/api/site')->assertStatus(503)->assertHeader('X-Frame-Options', 'DENY');
        $this->getJson('https://attacker.test/api/site')->assertStatus(400)->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $this->getJson('https://www.example.test/api/site')->assertOk()->assertHeader('Strict-Transport-Security', 'max-age=31536000');
        config(['app.debug' => true]);
        $this->getJson('https://www.example.test/api/site')->assertStatus(503)->assertDontSee('exception')->assertDontSee('trace');
    }

    public function test_only_explicit_proxy_ips_can_supply_https_and_client_ip(): void
    {
        Route::get('/api/transport-check', fn (Request $r) => response()->json(['ip' => $r->ip(), 'secure' => $r->isSecure(), 'host' => $r->getHost()]));
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])->withHeaders(['X-Forwarded-For' => '203.0.113.8', 'X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'attacker.test']);
        $this->getJson('http://localhost/api/transport-check')->assertOk()->assertJsonPath('ip', '10.0.0.1')->assertJsonPath('secure', false)->assertJsonPath('host', 'localhost');
        config(['trustedproxy.proxies' => ['10.0.0.1']]);
        $this->getJson('http://localhost/api/transport-check')->assertOk()->assertJsonPath('ip', '203.0.113.8')->assertJsonPath('secure', true)->assertJsonPath('host', 'localhost');
    }

    public function test_public_revalidation_cannot_serve_an_unpublished_cached_service(): void
    {
        $r = $this->getJson('/api/services/bank-csp')->assertOk();
        $tag = $r->headers->get('ETag');
        $this->assertNotEmpty($tag);
        $this->assertStringContainsString('private', $r->headers->get('Cache-Control'));
        $this->withHeader('If-None-Match', $tag)->getJson('/api/services/bank-csp')->assertStatus(304);
        Service::where('slug', 'bank-csp')->update(['is_published' => false]);
        $this->getJson('/api/services/bank-csp')->assertNotFound()->assertHeader('Cache-Control', 'no-store, private');
        $this->getJson('/api/services')->assertOk()->assertDontSee('bank-csp');
    }

    public function test_catalogue_query_count_is_bounded_and_does_not_grow_per_service(): void
    {
        DB::enableQueryLog();
        $this->getJson('/api/services')->assertOk()->assertJsonCount(32, 'data');
        $queries = collect(DB::getQueryLog())->filter(fn (array $q) => str_starts_with(strtolower($q['query']), 'select'));
        $this->assertLessThanOrEqual(3, $queries->count());
        DB::disableQueryLog();
    }

    public function test_production_exceptions_hide_details_and_log_only_exception_type(): void
    {
        Route::get('/api/failure-check', fn () => throw new \RuntimeException('secret-token contact@example.test'));
        $this->app['env'] = 'production';
        config(['app.debug' => false, 'app.url' => 'https://www.example.test']);
        Log::spy();
        $this->getJson('https://www.example.test/api/failure-check')->assertStatus(500)->assertExactJson(['message' => 'The request could not be completed.'])->assertHeader('Cache-Control', 'no-store, private')->assertDontSee('secret-token')->assertDontSee('contact@example.test');
        Log::shouldHaveReceived('error')->once()->with('Application request failed.', ['exception_type' => \RuntimeException::class]);
    }

    public function test_secure_http_only_session_cookie_and_mass_assignment_guard(): void
    {
        config(['session.secure' => true, 'session.http_only' => true, 'session.same_site' => 'lax', 'session.encrypt' => true]);
        $r = $this->getJson('https://localhost/api/enquiries/session')->assertOk();
        $cookie = collect($r->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === config('session.cookie'));
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isSecure());
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
        $user = new User;
        $this->assertFalse($user->isFillable('is_admin'));
        $this->assertContains('password', $user->getHidden());
    }

    public function test_cross_origin_requests_are_not_granted_cors_access(): void
    {
        $this->withHeader('Origin', 'https://attacker.test')->getJson('/api/site')->assertOk()->assertHeaderMissing('Access-Control-Allow-Origin')->assertHeaderMissing('Access-Control-Allow-Credentials');
        $this->getJson('/api/admin/enquiries')->assertUnauthorized()->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
