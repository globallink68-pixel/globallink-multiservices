<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DiagnosticCorrelationTest extends TestCase
{
    use RefreshDatabase;

    public function test_trusted_valid_id_is_propagated_and_untrusted_or_malformed_id_is_replaced(): void
    {
        $id = '11111111-1111-4111-8111-111111111111';
        config(['provider_workflow.trust_request_id_header' => true]);
        $this->withHeader('X-Request-ID', $id)->getJson('/api/admin/session')->assertHeader('X-Request-ID', $id);
        foreach (['bad-id', str_repeat('x', 1000)] as $invalid) {
            $response = $this->withHeader('X-Request-ID', $invalid)->getJson('/api/admin/session')->assertOk();
            $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $response->headers->get('X-Request-ID'));
            $this->assertNotSame($invalid, $response->headers->get('X-Request-ID'));
        }
        config(['provider_workflow.trust_request_id_header' => false]);
        $response = $this->withHeader('X-Request-ID', $id)->getJson('/api/admin/session')->assertOk();
        $this->assertNotSame($id, $response->headers->get('X-Request-ID'));
    }

    public function test_response_and_safe_database_log_share_generated_id_without_private_details(): void
    {
        $previous = new \PDOException('Synthetic password and SQL details');
        $previous->errorInfo = ['42S22', 1054, 'Synthetic private database detail'];
        Route::get('/api/diagnostic-fixture', fn () => throw new QueryException('mysql', 'select synthetic_private from private_table where secret=?', ['synthetic-secret'], $previous));
        $this->app['env'] = 'production';
        config(['app.url' => 'https://localhost', 'app.debug' => false]);
        Log::spy();
        $response = $this->getJson('https://localhost/api/diagnostic-fixture')->assertStatus(500)->assertJsonPath('message', 'The request could not be completed.')->assertJsonStructure(['request_id'])->assertDontSee('private_table')->assertDontSee('synthetic-secret')->assertDontSee('password');
        $this->assertSame($response->json('request_id'), $response->headers->get('X-Request-ID'));
        Log::shouldHaveReceived('error')->once()->with('Application request failed.', ['request_id' => $response->json('request_id'), 'exception_type' => QueryException::class, 'method' => 'GET', 'route' => 'api/diagnostic-fixture', 'database_error_category' => 'schema_mismatch']);
    }
}
