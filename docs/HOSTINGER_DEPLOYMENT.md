# Hostinger pre-deployment checklist — Phase 6

No deployment or Hostinger account access occurred. Complete these gates in Phase 7 before switching traffic.

## Runtime and layout

Verify PHP 8.4+, Composer platform requirements, PDO MySQL, mbstring, OpenSSL, fileinfo and GD with JPEG/PNG/WebP support on the selected plan. Confirm the actual MySQL version and privileges. Hostinger exposes PHP selection through [hPanel PHP configuration](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/); available versions and extensions must be checked in the account.

Keep backend source, vendor, .env, storage and bootstrap/cache private. Point the document root only at backend/public. Keep frontend/dist alongside backend so Laravel can read frontend/dist/.vite/manifest.json; copy only dist/assets into backend/public/assets. Laravel renders the initial HTML metadata and React entry for public routes. Do not serve dist/index.html as the fallback. Preserve the reviewed public/.htaccess and public/.user.ini, and verify that the host actually honors them. API failures must stay JSON; missing public pages must return 404. No production Node service is required.

Build from locked dependencies with npm ci and npm run build; install backend dependencies with composer install --no-dev --optimize-autoloader. Never upload tools, development databases, QA images, credentials or development environment files. Verify private paths, dotfiles, manifests, source maps and PHP upload files cannot be downloaded through the real web server.

## Environment and storage

Set APP_ENV=production, APP_DEBUG=false, APP_URL to the exact HTTPS origin, a privately generated APP_KEY and dedicated production database credentials. Keep encrypted sessions, Secure/HttpOnly/SameSite=Lax cookies, private file cache and one shared PHP filesystem. Set TRUSTED_PROXIES only to verified proxy IPs/CIDRs if TLS terminates upstream; never use a wildcard. Verify actual HTTPS detection, host rejection and HSTS before traffic. Cross-origin APIs are disabled. See [Laravel trusted proxy documentation](https://laravel.com/framework/docs/requests).

Verify writable private storage, bootstrap/cache, session/cache directories and PHP temporary/upload directories. Local QA required explicit temporary-directory flags; confirm real PHP-FPM temporary storage rather than copying local paths. Verify display_errors and display_startup_errors are off, expose_php is off, upload_max_filesize is 2M and post_max_size is 3M. Application media validation also applies. Inspect sanitized logs and protect backups containing contact data.

Use a dedicated MySQL schema/user. Back up before php artisan migrate --force; never migrate:fresh or reset existing data. Seed only an empty new installation. Preserve CMS, enquiries, histories, notes and administrator records. Create the first administrator privately with php artisan admin:create and its hidden password prompt. Configure SMTP only if an approved email feature requires it; current lead capture does not depend on mail.

CMS PNG assets remain in storage/app/private/cms. Back up this directory together with the database. Public media is reference-gated; private media requires an administrator. Do not run storage:link. Establish a reviewed unused-media cleanup policy.

## Cache, provider and operations

Build config, route and view caches only after verifying production values. Never expose cached configuration. Review tokens and atomic limits use the private file cache; clearing that cache invalidates pending reviews. A multi-server deployment needs separately validated shared coordination.

Keep GEMINI_ENABLED=false until the operator supplies and verifies a private key, model, outbound HTTPS access, quota and timeout. Never place keys in frontend variables or logs. Disabled/failed Gemini still offers the controlled team-contact flow. No paid service is required or billing authorized. Verify actual provider behavior separately before enabling it.

No background job or scheduler is currently required. If a later feature requires scheduling, configure it explicitly using [Hostinger cron guidance](https://support.hostinger.com/en/articles/1583465-how-to-set-up-a-cron-job-at-hostinger); do not add an unnecessary worker or cron job.

## Release gates and rollback

On a staging hostname verify Apache/LiteSpeed rewrites and configuration enforcement, TLS/cookies/CSRF, production error sanitization, body limits, rate limits, login/logout/session revocation, public/private media, lead creation and administrator CRM access. Confirm initial HTML metadata, canonical HTTPS URLs, robots.txt, sitemap.xml, publication changes and 404 behavior. Verify desktop/mobile keyboard and form acceptance with disposable data, then remove it.

Confirm backups can be restored privately. Retain the previous application/assets release and compatible environment; document maintenance mode, database backup, release switch and rollback. Do not blindly roll back migrations or overwrite enquiries created after release. Require explicit deployment approval, a domain/TLS plan, host access, tested restore and a named operator before production traffic.

Phase 6 validates application behavior locally. Actual host plan compatibility, TLS termination, Apache rules, PHP-FPM settings, backup restoration, production mail/provider configuration and deployment rollback remain Phase 7 gates.
