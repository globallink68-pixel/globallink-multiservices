# Hostinger deployment strategy — no deployment performed

This is a Phase 1 architecture plan. Verify the selected hosting plan's actual PHP version, extensions, MySQL access, document-root options and shell availability before Phase 7. The current Composer lock requires PHP 8.4+. Do not deploy it onto PHP 8.3 without a separately reviewed dependency resolution and full regression.

## Intended production layout

Build frontend locally with npm ci / npm run build. Serve frontend/dist as static assets. Install Laravel production dependencies with composer install --no-dev --optimize-autoloader, using PHP 8.4. Keep backend source, vendor, storage and .env outside the public web root. Only Laravel public/index.php and approved static assets should be web accessible.

Prefer one HTTPS origin: static /assets and index.html for the React SPA, /api and /up routed to the Laravel public front controller. BrowserRouter routes such as /services/bank-csp must return the SPA on direct navigation; /api failures must remain JSON and never rewrite to the SPA. On Apache/LiteSpeed use a reviewed rewrite configuration that checks real static files first and separates API routing from the SPA fallback. Do not blindly copy a rule that exposes the entire backend directory.

A dedicated API subdomain is a fallback only if document-root limitations demand it; explicitly configure CORS, credentials and frontend base URL then. Development uses Vite's same-origin proxy and does not need a production Node server. No always-running worker, Python process or Redis is needed for Phase 1.

## Environment and rollout gate

Create a new production database/user with only necessary privileges; never use another project's schema. Set APP_ENV=production, APP_DEBUG=false, APP_URL to the HTTPS domain, a generated APP_KEY, actual MySQL credentials, secure cookies and appropriate trusted proxy configuration. GEMINI_API_KEY/MODEL stay blank until Phase 4 approval. Never upload development environment files or the ignored tools directory.

The public middleware rejects insecure/debug production requests. Test HTTPS detection on the actual host before switching traffic. Cache config/routes only after verified environment values; ensure writable storage/bootstrap cache. Use Laravel's maintenance/migration procedure and back up the dedicated database before migrations. Do not run migrate:fresh on live data. Run initial catalogue seed only for a new empty installation, then manage verified content through the future CMS.

Phase 7 must validate rewrite behavior, public/private paths, HTTPS, headers, production errors, backups/restore, migration permissions, deployment rollback, secrets and end-to-end acceptance. No Hostinger account was accessed, no domain was changed and nothing was uploaded in this phase.

## SEO roadmap

Current service-specific titles/descriptions and semantic slug URLs are the foundation. Phase 6 will implement/validate canonical and OpenGraph metadata, organization/service structured data, sitemap generation for published services, and final robots policy. Decide static prerendering/HTML metadata strategy then so non-JavaScript social crawlers receive correct service metadata, without requiring a production Node server. Do not claim complete SEO or production readiness in Phase 1.
