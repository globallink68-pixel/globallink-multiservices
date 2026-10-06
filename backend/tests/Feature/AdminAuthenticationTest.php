<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function administrator(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    public function test_valid_login_session_and_logout(): void
    {
        $u = $this->administrator();
        $r = $this->postJson('/api/admin/login', ['email' => $u->email, 'password' => 'password'])->assertOk()->assertJsonPath('data.user.id', $u->id)->assertJsonStructure(['data' => ['csrf_token']])->assertDontSee('remember_token')->assertDontSee($u->password);
        $this->assertAuthenticatedAs($u);
        $this->getJson('/api/admin/session')->assertJsonPath('data.user.id', $u->id);
        $this->postJson('/api/admin/logout')->assertOk();
        $this->assertGuest();
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
        $this->assertDatabaseHas('audit_logs', ['action' => 'login']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'logout']);
    }

    public function test_invalid_login_is_generic_and_throttled(): void
    {
        $u = $this->administrator();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/login', ['email' => $u->email, 'password' => 'incorrect'])->assertUnprocessable()->assertDontSee($u->password);
        }
        $this->postJson('/api/admin/login', ['email' => $u->email, 'password' => 'incorrect'])->assertStatus(429);
        $this->assertGuest();
    }

    public function test_non_admin_cannot_login_or_use_cms(): void
    {
        $u = User::factory()->create();
        $this->postJson('/api/admin/login', ['email' => $u->email, 'password' => 'password'])->assertUnprocessable();
        $this->actingAs($u)->getJson('/api/admin/dashboard')->assertForbidden();
        $this->putJson('/api/admin/settings', [])->assertForbidden();
        $this->postJson('/api/admin/media', [])->assertForbidden();
    }

    public function test_every_admin_resource_requires_server_authentication(): void
    {
        foreach (['dashboard', 'categories', 'services', 'providers', 'faqs', 'settings', 'audit-logs', 'services/1', 'media/11111111-1111-1111-1111-111111111111'] as $path) {
            $this->getJson('/api/admin/'.$path)->assertUnauthorized();
        }
        foreach (['categories', 'services', 'providers', 'faqs', 'media'] as $path) {
            $this->postJson('/api/admin/'.$path, [])->assertUnauthorized();
        }
        $this->putJson('/api/admin/settings', [])->assertUnauthorized();
        $this->patchJson('/api/admin/services/1/publication', [])->assertUnauthorized();
    }

    public function test_session_bootstrap_has_no_user_secrets_and_http_only_cookie(): void
    {
        $r = $this->getJson('/api/admin/session')->assertOk()->assertJsonPath('data.user', null)->assertJsonStructure(['data' => ['csrf_token']]);
        $cookie = $r->getCookie(config('session.cookie'), false);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
    }

    public function test_bootstrap_command_hashes_password_and_refuses_duplicate_email(): void
    {
        $this->artisan('admin:create', ['email' => 'bootstrap@example.test'])->expectsQuestion('New administrator password', 'FictionalTestPass123')->expectsOutput('Administrator created. No password is printed.')->assertExitCode(0);
        $u = User::where('email', 'bootstrap@example.test')->firstOrFail();
        $this->assertTrue($u->is_admin);
        $this->assertTrue(Hash::check('FictionalTestPass123', $u->password));
        $this->artisan('admin:create', ['email' => 'bootstrap@example.test'])->expectsQuestion('New administrator password', 'FictionalTestPass123')->assertExitCode(1);
    }

    public function test_audit_authentication_records_never_store_credentials_or_tokens(): void
    {
        $u = $this->administrator();
        $r = $this->postJson('/api/admin/login', ['email' => $u->email, 'password' => 'password']);
        $token = $r->json('data.csrf_token');
        $this->postJson('/api/admin/logout');
        $logs = json_encode(DB::table('audit_logs')->get());
        $this->assertStringNotContainsString($u->password, $logs);
        $this->assertStringNotContainsString($u->email, $logs);
        $this->assertStringNotContainsString($token, $logs);
    }

    public function test_csrf_missing_or_wrong_token_is_denied_outside_test_bypass(): void
    {
        $user = $this->administrator();
        $this->app['env'] = 'local';
        $this->withSession(['_token' => 'known-csrf-token'])->postJson('/api/admin/login', ['email' => $user->email, 'password' => 'password'])->assertStatus(419);
        $this->withSession(['_token' => 'known-csrf-token'])->postJson('/api/admin/login', ['email' => $user->email, 'password' => 'password'], ['X-CSRF-TOKEN' => 'wrong-token'])->assertStatus(419);
        $this->withSession(['_token' => 'known-csrf-token'])->postJson('/api/admin/login', ['email' => $user->email, 'password' => 'password'], ['X-CSRF-TOKEN' => 'known-csrf-token'])->assertOk();
    }
}
