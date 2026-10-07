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

## Phase 7 execution record — 7 October 2026

Target authorized by the operator: `https://globallinkmultiservice.in`. Approved application rollback commit: `410e6f28a57f5787b0dc88831ba3e952b766ae51`, retained on `codex/phase-6`. A local Git bundle of that branch was created and verified under ignored tools/phase7; this is an application-source recovery point, not a production website/database backup.

Read-only preflight found an existing HTTPS site titled **Marketing Agency**, responding 200 through `hcdn`; HTTP redirected 301 to the HTTPS origin. The TLS certificate was accepted by the normal client validation and reported expiry 23 November 2026 UTC. A records resolved to 93.127.173.206 and 88.222.243.110 at the time of inspection; these are observed public addresses, not trusted proxy addresses or a DNS-change instruction. NS lookup timed out. Do not describe this as an empty initial installation, assume its implementation, or overwrite it without backup.

The browser exposed to Codex redirected hPanel to Hostinger login, although the operator reports an authenticated session elsewhere. Private sign-in/session access is required before plan, SSH, paths, existing files, databases and backups can be verified. No hosting settings, DNS, web files or production data have been changed by Codex at this point. Current execution status is tracked in PHASE_7_REPORT.md.

## Operator preflight and environment matrix

Inspect the selected site's hPanel hosting product and existing application first. A Website Builder site may need a supported PHP hosting document root; do not assume the existing domain is already attached to that root. Check whether SSH is already enabled and usable before requiring it. Hostinger documents SSH availability by plan in its [SSH access guide](https://www.hostinger.com/support/1583245-how-to-connect-to-a-hosting-plan-via-ssh-in-hostinger/). Do not enable new security-sensitive access or change credentials without the appropriate operator action. Never copy passwords into commands, chat, screenshots, Git or the local release.

Record the real CLI and web PHP versions independently. The project requires PHP ^8.4 even if generic Laravel documentation describes a lower minimum. Verify PDO/pdo_mysql, mbstring, openssl, tokenizer, ctype, fileinfo, GD PNG/JPEG/WebP, DOM/XML/XMLWriter and locked Composer requirements. Verify memory_limit (target at least 128M, raise only within plan capacity), max_execution_time compatible with the bounded 3–20 second provider timeout, writable PHP temporary/upload directories and 2M upload/3M POST limits. Validate the actual web SAPI configuration without leaving a public phpinfo/diagnostic endpoint.

Set these variable names privately on the production server; do not copy the development .env:

| Names | Required principle |
| --- | --- |
| APP_NAME, APP_ENV, APP_DEBUG, APP_URL | Correct company name, production, false, exact authorized HTTPS origin |
| APP_KEY | Strong private server key; preserve it on later releases |
| DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD | mysql and verified dedicated Hostinger database identity/credentials |
| SESSION_DRIVER, SESSION_LIFETIME, SESSION_ENCRYPT, SESSION_SECURE_COOKIE, SESSION_HTTP_ONLY, SESSION_SAME_SITE | database, reviewed lifetime, true, true, true, lax |
| CACHE_STORE, QUEUE_CONNECTION | file and sync for this single-host architecture |
| TRUSTED_PROXIES | Empty for direct verified HTTPS; only verified Hostinger upstream addresses otherwise |
| LOG_CHANNEL, LOG_LEVEL | Private single/error logging, warning or stricter as appropriate |
| GEMINI_ENABLED, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT | Disabled until a private key/provider is verified; never Vite variables |
| MAIL_MAILER, MAIL_SCHEME, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, MAIL_EHLO_DOMAIN | SMTP only when available and verified; current enquiry capture does not send mail |

FRONTEND_URL is a development setting; production public metadata uses APP_URL. Requests use same-origin /api. Do not upload an environment containing localhost database ports or development credentials. Verify only redacted configuration properties/booleans; never print complete config:show output for database, mail or app key.

## Backup before cutover

1. Identify the actual current site root, hosting product, database(s), private media and domain binding. Record UTC and Asia/Calcutta deployment timestamps and the approved source commit in the private change record.
2. Create and verify an account/site backup through hPanel, or a complete private file archive plus consistent MySQL dump when existing shell access permits. Include relevant dotfiles, current release, existing application configuration, media and database. Keep secrets/PII in access-controlled private backups outside every document root. Check archive contents, size and checksum; confirm the restoration mechanism and retention before changing the old site.
3. Record actual backup identifiers privately. An untested backup job, local Git bundle or screenshot is not a database backup. If an existing builder application is present, verify its supported recoverable backup/export and domain-rebinding procedure first.
4. With existing SSH, an operator may use `mysqldump --single-transaction --routines --triggers --no-tablespaces -p DATABASE > PRIVATE_BACKUP.sql`; enter any password privately at the prompt. Use the actual verified database identity and compatible client. Restore into a separate private database to validate before destructive cutover. Never publish the dump or supply a password argument.

## Directory layout and deployment sequence

Preferred: a private release directory containing sibling backend and frontend, with the document root mapped to backend/public. frontend/dist/.vite/manifest.json stays private; public assets live only in backend/public/assets. Laravel application code, .env, vendor, database, storage, tests and logs remain outside the web root.

If the selected account fixes the document root to public_html, keep `globallink/current/backend` and `globallink/current/frontend/dist/.vite` as private siblings outside public_html. Copy only backend/public contents into public_html. In the host-specific index.php change its three relative maintenance/autoload/bootstrap paths to the verified private backend directory and set `$app->usePublicPath(__DIR__)` before handling the request. Preserve .htaccess/.user.ini. This adapter must be reviewed against the real resolved paths and tested before cutover; it is not yet applied or assumed compatible. Do not put the complete project beneath public_html or rely only on deny rules to hide it.

1. Stage the approved application and locked production dependencies in a separate private release. Run `composer install --no-dev --optimize-autoloader --no-interaction` with verified PHP 8.4. No Composer update or architecture migration.
2. Build frontend locally with npm ci and npm run build. Verify hashed manifest entries and lazy bundles; upload only intended artifacts. Do not upload node_modules, source maps, tests, tools, Git metadata, development env or compiled local config caches. React Router includes inert localhost URL-construction defaults in vendor code; application network requests must still resolve to the production same-origin /api. Do not modify vendor behavior to hide these library literals.
3. Attach shared private CMS storage and verified production .env without overwriting either. Use least-privilege ownership/modes compatible with the account, normally private files 600/640 and directories 700/750 where supported; never chmod 777. Confirm PHP can write storage/framework/cache/data, sessions, views, logs and bootstrap/cache.
4. Confirm database identity, protected-data snapshot, backups and `php artisan migrate:status` before `php artisan migrate --force --no-interaction`. All seven existing migrations must be applied. No Phase 7 schema change is required. Never run migrate:fresh, db:wipe or blanket migration rollback.
5. If there is no Global Link database, use a dedicated empty schema. Preserve the legitimate local enquiry and CMS through an explicitly identified private data transfer/merge if this is the system's initial production data source. Do not replace an existing production schema or claim that seeding preserves that enquiry. The approved CatalogueSeeder uses firstOrCreate/insert-missing; run it only for a verified new installation, never as a substitute for preserving existing data. Do not import ephemeral sessions/cache or QA rows. Validate migration and protected-record counts/hashes after transfer.
6. Create the first administrator only when needed using `php artisan admin:create EMAIL --name="Administrator"` with private interactive password entry. Never seed a default administrator or place passwords in arguments.
7. Clear only config, route and view caches, then build them with the correct server environment:

```sh
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Do not use cache:clear/optimize:clear as a release shortcut because pending business review tokens use application cache. Keep private cache storage shared across releases. No scheduler/worker is currently required.

8. Switch the verified document root/release only after backups and staging checks. Configure HTTP-to-HTTPS at Hostinger/web-server level, then verify no redirect loop, certificate validity, no mixed content, canonical origin, actual proxy handling and encrypted Secure/HttpOnly/Lax cookies. Do not weaken application HTTPS/host checks or blindly trust observed CDN A records.
9. Verify upload re-encoding, private storage/reference gates and real Apache rules. No storage:link is required. Confirm .env, logs, SQL dumps, .git, .vite manifests and executable upload paths are not downloadable.

## Live acceptance, cleanup and maintenance

Run the public/admin/assistant/SEO/security checklist from the Phase 7 request against the actual HTTPS Laravel release. Use only a few bounded non-destructive requests, not load testing. Check all 32 published services and five categories, initial HTML metadata, sitemap/robots, private no-store/noindex, CSRF, authorization, errors, limits, CORS and HTTPS headers. Test responsive desktop/mobile web, CMS media publication/revocation, enquiry consent/reference-only results, CRM history/notes and logout. If Gemini is disabled, qualify its failure handoff without claiming a live model call; if enabled, limit provider tests and exclude private/unpublished data.

Before creating QA records, capture a safe protected-data snapshot privately and assign exact fictional names/references/IDs. Cleanup only those verified IDs and dependent rows/uploads. Account for legitimate new leads that arrive during acceptance rather than requiring an unchanged whole-table hash under live traffic. Never print real visitor contact details or administrator credentials. Preserve existing user data and audit history. Record exact cleanup outcomes.

For maintenance/redeployment, stage a new private release, back up and verify database/media, retain the current application and APP_KEY, reuse shared private state, apply reviewed forward migrations if any, regenerate caches, switch safely and rerun bounded acceptance. Retain old hashed assets long enough for already-open browsers; purge only reviewed obsolete release files afterward.

Rollback: stop the cutover/put the failing Laravel release into maintenance when safe; restore the previous verified web-root/domain binding and release files with their matching private environment/media. Clear/rebuild only config/route/view caches and verify the old site. Phase 7 introduces no schema migration, so prefer application rollback with the current database intact. A database restore is a separate approved recovery action: preserve post-backup enquiries and reconcile them first; never blindly import an old dump over live user data. Use `mysql -p DATABASE < PRIVATE_BACKUP.sql` only into the verified recovery target with private password entry and a tested plan. Do not use migrate:rollback on unrelated existing migrations.
