# Hostinger deployment strategy — no deployment performed

This is the Phases 1–3 architecture plan. Verify the selected plan's PHP, extensions, MySQL, document roots and shell availability before Phase 7. The lock requires PHP 8.4+ and GD with JPEG/PNG/WebP support. PHP 8.3 or absent GD requires a separately reviewed change and full regression.

## Intended production layout

Build frontend locally with npm ci / npm run build. Serve frontend/dist as static assets. Install Laravel production dependencies with composer install --no-dev --optimize-autoloader, using PHP 8.4. Keep backend source, vendor, storage and .env outside the public web root. Only Laravel public/index.php and approved static assets should be web accessible.

Prefer one HTTPS origin: static /assets and index.html for the React SPA, /api and /up routed to the Laravel public front controller. BrowserRouter routes such as /services/bank-csp must return the SPA on direct navigation; /api failures must remain JSON and never rewrite to the SPA. On Apache/LiteSpeed use a reviewed rewrite configuration that checks real static files first and separates API routing from the SPA fallback. Do not blindly copy a rule that exposes the entire backend directory.

Phase 2 assumes one origin. An API subdomain requires a separately validated CORS/cookie/CSRF design and frontend base URL; it is not configured here. Development uses Vite's same-origin proxy. No production Node/Python service, Redis, persistent worker or paid storage is required.

## Environment and rollout gate

Create a new production database/user with only necessary privileges; never use another project's schema. Set APP_ENV=production, APP_DEBUG=false, APP_URL to the HTTPS domain, a generated APP_KEY, actual MySQL credentials, secure cookies and appropriate trusted proxy configuration. Keep `GEMINI_ENABLED=false` until the configured provider is verified. Optional Gemini settings belong only in Laravel environment/config: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash-lite`) and `GEMINI_TIMEOUT` (default 12, clamped 3–20 seconds). Never upload development environment files or the ignored tools directory.

Phase 4 needs outbound HTTPS to `generativelanguage.googleapis.com`, PHP's existing HTTP-client capabilities and writable private session/file-cache storage. No Redis, vector database, Python or AI server is required. Hostinger PHP execution limits should exceed the bounded API timeout and normal retrieval overhead. Set trusted proxies correctly so IP limits cannot be spoofed. Gemini free-tier availability/quotas depend on the provider project; do not assume a fixed free allowance or enable billing without operator approval. The website works with Gemini disabled. Rebuild configuration cache privately after changing settings; keep keys and cached configuration outside the public directory. Production provider/HTTPS/cookie/shared-host verification remains pending.

The middleware rejects insecure/debug production requests. Test HTTPS detection on the actual host before switching traffic. Cache config/routes only after verified environment values; ensure writable storage/bootstrap cache. Back up the dedicated database before migrations. Never run migrate:fresh on live data. Seed only a new empty installation, then use the CMS.

Keep encrypted database sessions, HttpOnly/Secure/SameSite=Lax cookies and an appropriate lifetime. Route `/api/admin/*` to Laravel web routes preserving cookies and CSRF headers. Create administrators through `php artisan admin:create business-email --name="Administrator"` using the hidden password prompt on the private host shell. No default account/public registration exists. Never put bootstrap passwords in CLI arguments or repository examples.

Raster media lives in `backend/storage/app/private/cms` under UUID filenames. Back up this directory with the database. Never expose the private disk or backend as static content. `/api/media/{uuid}` permits only public references; `/api/admin/media/{uuid}` requires an administrator. No storage:link is needed. A reviewed reference-aware cleanup procedure is needed for unused media; a pruning UI is deferred.

Phase 7 must validate rewrite behavior, public/private paths, HTTPS, headers, production errors, backups/restore, migration permissions, deployment rollback, secrets and end-to-end acceptance. No Hostinger account was accessed, no domain was changed and nothing was uploaded in this phase.

Phase 3 requires the same-origin `/api/enquiries/session` and POST `/api/enquiries` routes to retain Laravel web session/CSRF handling. `/api/admin/enquiries/*` must reach protected web routes, never a static/public response cache. Preserve no-store headers for contact data. The file-cache limiter and atomic mobile lock assume one PHP host sharing the same writable cache filesystem; a multi-host setup needs separately validated shared locking/rate limiting. No paid infrastructure, worker or external CAPTCHA is required.

Back up the dedicated database privately, including enquiry/history/note tables. Decide retention and controlled correction/removal procedures, protect backups containing contact data, and validate HTTPS/cookies/CSRF and spam thresholds under real traffic before production. The incremental migration preserves CMS tables; migrate:fresh remains forbidden on production.

## SEO roadmap

Current service-specific titles/descriptions and semantic slug URLs are the foundation. Phase 6 will implement/validate canonical and OpenGraph metadata, organization/service structured data, sitemap generation for published services, and final robots policy. Decide static prerendering/HTML metadata strategy then so non-JavaScript social crawlers receive correct service metadata, without requiring a production Node server. Do not claim complete SEO or production readiness in Phase 1.
