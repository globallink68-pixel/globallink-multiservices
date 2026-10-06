<?php

use App\Http\Middleware\PublicSecurityHeaders;
use App\Http\Middleware\RequireAdministrator;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(PublicSecurityHeaders::class);
        $middleware->trustProxies(at: [], headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_PORT);
        $middleware->alias(['admin' => RequireAdministrator::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['password', 'password_confirmation', 'current_password', 'email', 'mobile', 'name', 'message', 'review_token', 'otp', 'token']);
        $exceptions->respond(function (Response $response): Response {
            if (app()->environment('production') && ($response->getStatusCode() >= 500 || (config('app.debug') && $response->getStatusCode() >= 400))) {
                $response = response()->json(['message' => 'The request could not be completed.'], $response->getStatusCode());
            }

            return PublicSecurityHeaders::decorate(request(), $response);
        });
        $exceptions->report(function (Throwable $exception): ?bool {
            if (app()->environment('production')) {
                Log::error('Application request failed.', ['exception_type' => $exception::class]);

                return false;
            }

            return null;
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
