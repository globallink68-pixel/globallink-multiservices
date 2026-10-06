<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PublicSecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production')) {
            $host = parse_url(config('app.url'), PHP_URL_HOST);
            if (! $request->isSecure() || config('app.debug') || parse_url(config('app.url'), PHP_URL_SCHEME) !== 'https') {
                return self::decorate($request, response()->json(['message' => 'Production HTTPS configuration is required.'], 503));
            }
            if (! $host || strcasecmp($request->getHost(), $host) !== 0) {
                return self::decorate($request, response()->json(['message' => 'Invalid request host.'], 400));
            }
        }
        $limit = $request->is('api/admin/media') ? 3 * 1024 * 1024 : ($request->is('api/admin/*') ? 1024 * 1024 : 16 * 1024);
        if ((int) $request->header('Content-Length', 0) > $limit || (! str_starts_with((string) $request->header('Content-Type'), 'multipart/form-data') && strlen($request->getContent()) > $limit)) {
            return self::decorate($request, response()->json(['message' => 'Request body is too large.'], 413));
        }

        $response = $next($request);

        return self::decorate($request, $response);
    }

    public static function decorate(Request $request, Response $response): Response
    {
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        if (! $response->headers->has('Content-Security-Policy')) {
            $response->headers->set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'");
        }
        $response->headers->set('Cache-Control', 'no-store');
        if ($request->is('api/*', 'admin', 'admin/*') || $response->getStatusCode() >= 400) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }
        if (app()->environment('production') && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }
        // Revalidate public JSON against current publication state before every reuse.
        if ($request->isMethod('GET') && in_array($request->route()?->getName(), ['catalogue.site', 'catalogue.index', 'catalogue.show'], true) && $response->getStatusCode() === 200) {
            $response->headers->set('Cache-Control', 'private, max-age=0, must-revalidate');
            $response->setEtag(hash('sha256', $response->getContent()));
            $response->isNotModified($request);
        }

        return $response;
    }
}
