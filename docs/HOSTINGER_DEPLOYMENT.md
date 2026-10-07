# Manual Hostinger deployment — Global Link Multiservice

Target: **https://globallinkmultiservice.in**. This guide is for the owner to execute manually. Codex has not accessed hPanel, uploaded anything, changed DNS or deployed the application during this manual-preparation task. The screenshot establishes an active domain in the owner's account, not PHP hosting compatibility. The previously observed Marketing Agency website must be recoverably backed up before replacement.

Approved application rollback commit: `410e6f28a57f5787b0dc88831ba3e952b766ae51`. Phase 7 preparation continues from `b0d6d0b7de9c2b21f2833b7bd35cac6c8fd4c2ef`. Keep the old application/site backup separately: these Git commits are not production database backups.

## Package and exact directory layouts

`dist/hostinger/globallink-production.zip` contains:

- `globallink/backend`: Laravel source, seven migrations, approved CatalogueSeeder, production vendor dependencies, empty writable-directory scaffolding, original Laravel public entry and `production.env.example`.
- `globallink/frontend/dist/.vite/manifest.json`: private Vite manifest.
- `public_html`: hashed frontend assets, favicon, reviewed .htaccess/.user.ini and a prepared public entry pointing to the private sibling backend.
- `DEPLOYMENT_README.md` and `HOSTINGER_MANUAL_CHECKLIST.md`: instructions; keep these outside the web root.

No completed .env, database dump, administrator, enquiry, private media, test dataset, node_modules, PHP binaries or QA screenshots are included. Production vendor dependencies are included, so Composer need not be installed on Hostinger. PHP CLI is still required for key generation, migrations, seeding, administrator creation and caches. If your account has no private PHP CLI execution facility, ask Hostinger support to execute those commands securely. Do not create public web migration/key/administrator runners or assume File Manager can execute Artisan.

**A. Preferred configurable document root**

```text
/home/ACCOUNT/domains/globallinkmultiservice.in/
  globallink/
    backend/                 # private; .env/vendor/storage/database stay here
      public/                # selected document root, including assets
    frontend/dist/.vite/manifest.json
  backups/                   # private and access controlled
```

If your plan permits an explicit document root, point it to `globallink/backend/public`. Use its original index.php without changes; the package's separate public_html copy is not needed. Keep all files above that public subdirectory inaccessible by URL.

**B. Fixed public_html fallback (prepared in the ZIP)**

```text
/home/ACCOUNT/domains/globallinkmultiservice.in/
  globallink/backend/        # private source/.env/vendor/storage
  globallink/frontend/dist/.vite/manifest.json
  public_html/
    index.php               # prepared sibling-path entry
    .htaccess
    .user.ini
    favicon.ico
    assets/                 # hashed JS/CSS only
  backups/                  # private
```

Upload the `globallink` folder to the domain directory **beside**, not inside, public_html. Place only the contents of the package's public_html folder in the live public_html root after backups and staging. The prepared entry uses `dirname(__DIR__).'/globallink/backend'` for maintenance, autoload and bootstrap paths, then `$app->usePublicPath(__DIR__)`. No account-specific absolute path needs insertion for this exact sibling layout. If your account's actual paths differ, adjust that single backendPath to the independently verified private location and test it before switching traffic. Never guess the path.

If File Manager cannot access a private parent directory or the selected product is Website Builder-only, STOP and have Hostinger establish a suitable PHP hosting layout. Do not upload the whole ZIP or Laravel private folder into public_html as a shortcut. No storage symlink is needed.

## Numbered manual procedure

1. **Select the website/domain.** In hPanel Websites find globallinkmultiservice.in and inspect its hosting product, plan and actual root. Do not confuse the Domains portfolio with hosting readiness. Verify that PHP hosting and MySQL are available. If it is Website Builder, establish its backup/restore and domain-rebinding procedure first; do not delete it to experiment. Do not change unrelated domains.

2. **Back up the existing Marketing Agency site.** In the selected site's Backups area create/download a recoverable backup of all current website files, including relevant dotfiles and private application configuration/media. For a builder site use its supported backup/export/restore process. Record the backup identifier and timestamp privately. Verify archive contents, size and checksum and the exact restore method before replacement.

3. **Back up any existing database.** Identify which databases belong to the old site; preserve each relevant one through hPanel/phpMyAdmin export or a consistent private MySQL dump. Never reuse/wipe an unrelated database. Keep backups outside every public root and Git. Test restoration into a separate recovery target where practical. No backup is claimed created by Codex. Preserve any post-backup enquiries during later restoration.

4. **Select PHP 8.4 and extensions.** In the site's PHP Configuration verify both web and private CLI PHP are 8.4+ compatible with `^8.4`, not just the generic Laravel minimum. Enable PDO/pdo_mysql, mbstring, openssl, tokenizer, ctype, fileinfo, GD with PNG/JPEG/WebP, DOM/XML/XMLWriter and the locked runtime requirements. In the private CLI run `php -v` and `php -m`; expect PHP 8.4 and these modules. Verify upload_max_filesize=2M, post_max_size=3M, memory_limit at least 128M (higher only within plan capacity), max_execution_time at least 60 seconds, writable PHP temporary/upload directories, display/startup errors off and expose_php off. `.user.ini` supplies the upload/error/time settings; memory and temporary directories must be set/verified through the real SAPI. Do not leave public phpinfo files.

5. **Create the dedicated MySQL database.** In hPanel Databases → Management (label may vary), create a new database and user for this Laravel installation, using a strong private password. Grant only the required application/migration privileges on that database. Record its actual prefixed name, user, host and port privately. MySQL 8.0 was locally qualified; verify actual host compatibility and utf8mb4. Do not assume DB_HOST is a public DNS address or copy development port 3312. Existing Global Link data must be preserved rather than overwritten.

6. **Upload the ZIP privately.** Download/use `dist/hostinger/globallink-production.zip` and its adjacent SHA256 receipt. In File Manager upload into a new private staging directory under the domain's parent, outside public_html. Compare its SHA-256 with the receipt before extracting. Do not temporarily publish the package ZIP. hPanel upload/browser size limits and private-folder access must be verified on your account.

7. **Extract and place Laravel files.** Extract into the private staging directory. Inspect the listed folders before moving anything. Place globallink/backend and its sibling frontend directory at the exact private layout above. Production vendor is already included; do not run Composer update. Keep the extracted guide/checklist and receipts private. Do not overwrite existing `.env` or private CMS files when redeploying.

8. **Configure the public root.** Use layout A when supported; otherwise use layout B's prepared public_html contents. After the old site backup is verified, switch/replace only the intended site's public root in a controlled cutover. Preserve the old root as a recoverable private backup, not an old executable app left within the new root. Remove the old static index.html when switching so it cannot shadow Laravel index.php. Confirm dotfiles are visible and .htaccess/.user.ini were copied. Laravel supplies public HTML; never use Vite dist/index.html as fallback.

9. **Create production .env privately.** In globallink/backend copy production.env.example to .env, using File Manager with hidden-file visibility or `cp production.env.example .env` in the backend private CLI. The blank secret fields are placeholders, not usable credentials. Enter real values privately on the server. Set APP_ENV=production, APP_DEBUG=false and APP_URL=https://globallinkmultiservice.in. Do not upload the local development .env. Do not place .env in public_html or include values in screenshots/chat/Git.

10. **Generate APP_KEY.** Every following Artisan command runs with working directory **globallink/backend**, using the verified PHP 8.4 binary (replace bare php with its verified path if needed). Run `php artisan key:generate --force`; expect a success message and a private .env key. Do not use --show or print the key. On redeployment preserve the existing key; rotating it breaks encrypted sessions/data. Protect .env permissions.

11. **Configure MySQL privately.** Set DB_CONNECTION=mysql, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME and DB_PASSWORD to the exact database created/verified in step 5. Leave no REPLACE_WITH placeholders. Do not print database config or passwords. Confirm identity in hPanel/phpMyAdmin and record a safe private table/count inventory and backup status. MySQL password/connection failures must be fixed privately rather than enabling debug.

12. **Run safe migrations.** From globallink/backend run `php artisan migrate:status`; inspect the selected schema and backup first. A genuinely new schema may report the migration table does not exist. Then run `php artisan migrate --force` followed by `php artisan migrate:status`. Expect all seven existing migrations marked Ran. Never run migrate:fresh, db:wipe or broad rollback. No new Phase 7 migration exists.

13. **Initialize or preserve approved data.** Only for a verified empty installation after migrations, run `php artisan db:seed --class='Database\Seeders\CatalogueSeeder' --force` (in a shell use the quoted class form below). It inserts missing approved catalogue records without overwriting existing values. Expected baseline: categories 5, services 32, service_content_items 52, providers 8, bank_service_details 8, faqs 4, site_settings 10. Use phpMyAdmin SELECT COUNT(*) on these tables to verify. Do not seed a populated production schema blindly. If the approved local CMS/enquiry/history is the initial data source, transfer it privately into a verified dedicated empty schema instead of replacing it with seed defaults; export/import with tested backups and exact database identity, exclude ephemeral sessions/cache and never publish the dump. The package deliberately contains no contact data; the existing legitimate visitor enquiry remains local until you safely transfer it. For an already live Global Link database preserve all CMS and enquiries, including new live arrivals.

14. **Verify storage and permissions.** Ensure backend/storage/app/private/cms, storage/framework/cache/data, storage/framework/sessions, storage/framework/views, storage/logs and bootstrap/cache exist and are writable by the account's PHP user. Use account-compatible least-privilege ownership/modes (typically private directories 700/750, files 600/640; public assets normally 644); do not chmod 777. Verify PHP temp storage separately. No `php artisan storage:link` is required: CMS PNGs remain private and are served only through reference-gated controllers. Back up media with the database. Upload one explicitly fictional QA image later through CMS, not directly into public_html.

15. **Configure SSL and HTTPS.** In hPanel SSL verify the domain certificate and enable supported Force HTTPS/server redirection. Keep HTTPS enforcement at the actual front proxy/web server; the application rejects insecure production requests. Test HTTP 301/308 to the exact HTTPS origin and no loops. APP_URL is also the allowed host; there is no separate TRUSTED_HOSTS setting. Leave TRUSTED_PROXIES empty for verified direct TLS, or use only independently confirmed Hostinger proxy IPs/CIDRs. Do not trust the observed CDN A addresses or wildcard proxies. Never disable CSP/host/HTTPS checks to make the host work.

16. **Configure optional SMTP.** Current enquiry capture does not send email and works with MAIL_MAILER=log. If approved SMTP details are available, enter MAIL_HOST/PORT/SCHEME/USERNAME/PASSWORD and FROM fields privately and set MAIL_MAILER=smtp. Verify certificate/STARTTLS and one controlled mail test through a supported private operator process; do not invent a working SMTP result. Keep logs private. No marketing mailing or email feature is added by this package.

17. **Configure optional Gemini.** Keep GEMINI_ENABLED=false initially. The disabled/failed provider offers controlled team-contact qualification. If a private key is available, set GEMINI_API_KEY only in server .env, choose the approved model and bounded timeout, verify outbound HTTPS and provider quota, then enable and test only a small number of grounded answers. Never put the key in Vite variables, public assets or logs. If unavailable, mark live Gemini pending and verify fallback; no paid service is required or authorized by this guide.

18. **Build production Laravel caches.** After all environment settings are correct, run the cache block below from globallink/backend. Expect success messages for each. Recheck site and cookies afterward. Do not run cache:clear/optimize:clear as a shortcut: active review tokens and rate limits use private application cache. No scheduler/worker is currently required. If PHP CLI is unavailable, have Hostinger support execute the exact private commands; File Manager alone cannot complete this stage.

19. **Verify homepage.** Open the actual HTTPS site in desktop and mobile browsers; expect the Global Link interface, not Marketing Agency. Verify navigation, all five categories, CMS contact information, providers, FAQs, keyboard/focus, responsive menus and no mixed content. The root should return 200; a random missing page should return 404. Never call a successful static old homepage a successful Laravel deployment.

20. **Verify all 32 services.** Run the client-side service-route block below and browse representative details. Expect 32 published services with API/detail HTML 200 and service-specific initial head metadata. Verify inactive/unpublished items cannot be fetched or listed. Baseline category-filter pages and canonical query handling must work.

21. **Verify ordinary enquiry.** Before testing identify a fictional QA name/message/mobile and record its exact eventual reference/ID privately. Test invalid fields, associated error messages, consent and one valid enquiry. Expect reference-only success with no returned contact data. Capture safe evidence without real visitor details. This creates a real production QA record that must be removed precisely later.

22. **Verify administrator/CRM.** If no administrator exists, run `php artisan admin:create YOUR_BUSINESS_EMAIL --name="Administrator"` from the private backend directory and enter a strong password at the hidden prompt. Never supply a password argument or seed default credentials. Verify login, dashboard, CRM filters, fictional lead detail/status/history/note, CMS categories/services/providers/FAQs/settings, image re-encoding/size/reference behavior, audit summaries and logout. Use a separate fictional service for publication tests so legitimate data remains unchanged. Verify a logged-out private API returns 401 and admin HTML shows login/noindex. Never screenshot passwords or unfiltered real lead data.

23. **Verify assistant and AI_ASSISTANT CRM.** With Gemini disabled, confirm safe failure/team-contact handoff. Submit one explicitly fictional assistant lead only after review, edit/review and fresh confirmation; verify reference-only success and correct AI_ASSISTANT source, consent and NEW history in CRM. Editing must invalidate prior confirmation. If enabled, verify grounded service/source links and no invented fees/partnerships/guarantees/private data, using a few requests only. Live model verification remains pending without a key.

24. **Verify SEO.** Inspect actual response source, not just React DOM: CMS title/description, canonical exact HTTPS URLs, OpenGraph/Twitter tags, semantic headings, robots and sitemap. Expect 39 baseline sitemap URLs (root/catalogue/five categories/32 services), no admin/private API/draft entries, true 404/noindex for missing content. Keep claims truthful; no invented structured ratings.

25. **Verify headers and API security.** Run the bounded checks below; expect CSP, HSTS, nosniff, DENY and referrer/permissions policies. Enquiry/admin contact responses must be private no-store; public JSON may privately revalidate with ETags. Verify session cookies Secure/HttpOnly/SameSite=Lax, CSRF 419 for uninitialized POST, no permissive CORS and sanitized errors. Check .env/.git/log/SQL/private manifest URLs return 403/404 and never file content. Do not test real secrets, destructive payloads or load limits by flooding. Real Apache/.user.ini/proxy behavior must be verified on the account.

26. **Clean up only exact QA records.** Record IDs/references before cleanup; use the approved admin workflow where supported. If physical deletion requires private DB maintenance, back up first and verify each exact ID plus fictional identity. Delete only those lead IDs and their dependent QA notes/histories, exact fictional service/media/admin rows where applicable, and corresponding UUID PNG. Do not use name-prefix-wide DELETE or delete legitimate audit/visitor data. Remove QA credentials, diagnostics and temporary uploads. Compare protected record hashes/counts, allowing identified legitimate new arrivals. The real owner administrator is not a disposable QA account.

27. **Create the final backup.** After acceptance and exact cleanup, create/verify a new private backup of release files, completed private environment, database and CMS PNGs. Record release commit, timestamps, migration status, package checksum and restore instructions privately. Keep the prior Marketing Agency backup until rollback retention is agreed. No backups or secrets belong in public_html or Git.

28. **Rollback safely if needed.** Stop cutover or put the failing Laravel release into maintenance using `php artisan down` only when appropriate. Restore the verified previous site/root/domain binding and matching application/private environment/media; do not guess builder restoration. For an earlier Laravel release preserve APP_KEY and shared state, clear/rebuild only config/route/view caches and run `php artisan up` after verification. Phase 7 adds no schema changes. Keep the current DB whenever compatible. A database restore is a separate controlled recovery action into the exact target: preserve/reconcile post-backup enquiries before using any old dump. Never blindly restore an old DB over new user data or run migrate:rollback across unrelated migrations. Recheck HTTPS, old homepage and user-data integrity.

## Commands and expected results

All server commands run in the private `globallink/backend` directory with the actual PHP 8.4 executable. hPanel labels/access vary; use its supported private execution facility or ask Hostinger support. No server access is assumed or performed by Codex.

```sh
php -v
php -m
php artisan migrate:status
php artisan migrate --force
php artisan migrate:status
# Only a verified empty installation; quote the class to preserve backslashes:
php artisan db:seed --class='Database\Seeders\CatalogueSeeder' --force
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Expect PHP 8.4+, all seven migrations Ran, successful seed only when intended, and successful cache messages. Verify bootstrap/cache/config.php and routes-v7.php exist after caching; compiled views are generated under storage/framework/views. Do not display their contents, which may contain secrets. Confirm writable directories through File Manager permissions and an actual controlled CMS upload; never expose diagnostic files.

Run these **from your own Windows PowerShell**, after deployment, with curl.exe (not PowerShell's curl alias). These are read-only except the empty invalid POST that must fail CSRF without creating a record:

```powershell
curl.exe -sS -o NUL -w "%{http_code}" https://globallinkmultiservice.in/
curl.exe -sS -I http://globallinkmultiservice.in/
curl.exe -sS -I https://globallinkmultiservice.in/
curl.exe -sS https://globallinkmultiservice.in/robots.txt
curl.exe -sS https://globallinkmultiservice.in/sitemap.xml
curl.exe -sS -i -H "Accept: application/json" https://globallinkmultiservice.in/api/admin/enquiries
curl.exe -sS -i -H "Accept: application/json" -H "Content-Type: application/json" --data "{}" https://globallinkmultiservice.in/api/enquiries
curl.exe -sS -I -H "Origin: https://untrusted.invalid" https://globallinkmultiservice.in/api/site
curl.exe -sS -o NUL -w "%{http_code}" https://globallinkmultiservice.in/services/absent-manual-check
curl.exe -sS -o NUL -w "%{http_code}" https://globallinkmultiservice.in/.env
```

Expected: root 200; HTTP 301/308 to exact HTTPS; secure headers on HTTPS; robots private-route exclusions/public-rendering allowances; sitemap baseline 39; private API 401 plus no-store/noindex; invalid POST 419; no Access-Control-Allow-Origin allowing the untrusted origin; missing service 404; .env 403/404. A HEAD header check must not be used as proof of initial HTML metadata; retrieve source too. Do not log private authenticated responses/cookie values.

```powershell
$manualOrigin = 'https://globallinkmultiservice.in'
$manualServices = (Invoke-RestMethod "$manualOrigin/api/services").data
if ($manualServices.Count -ne 32) { throw 'Published baseline differs: investigate, do not reseed blindly' }
foreach ($manualService in $manualServices) {
    $manualDetail = Invoke-WebRequest "$manualOrigin/services/$($manualService.slug)"
    $manualApi = (Invoke-RestMethod "$manualOrigin/api/services/$($manualService.slug)").data
    if ($manualDetail.StatusCode -ne 200 -or $manualApi.slug -ne $manualService.slug -or !$manualDetail.Content.Contains('property="og:title"')) { throw "Failed $($manualService.slug)" }
}
'32 published service API/HTML routes checked'
```

Browser checks for cookies, forms, assistant qualification, CRM and media remain essential; these commands do not certify them. Do not send unverified Gemini requests or actual identity/banking documents.

## Rebuilding this package locally

The package builder is scripts/Build-HostingerPackage.ps1. Use a separate **production-only** vendor directory generated from composer.lock with `composer install --no-dev --optimize-autoloader`, not backend/vendor containing development packages. It requires 76 locked production packages. Build frontend first, then run the script with -ProductionVendorDirectory pointing to that private local vendor directory. It refuses an existing output directory to prevent accidental overwrite. The final reviewed ZIP and checksum are the delivery artifacts; the builder itself is not uploaded to public_html. The package has no source maps, local application endpoints or completed environment. Vendor/private config contains normal loopback defaults overridden by .env; React Router contains two inert localhost URL-construction literals. The actual package scan records and classifies these; they are not a configured production API.

References: [Hostinger PHP configuration](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/), [Laravel deployment](https://laravel.com/framework/docs/deployment). Account-specific runtime, File Manager paths, TLS termination, backups and manual command execution must still be verified by the owner.

### Safe database identity and baseline checks

Run in phpMyAdmin's SQL tab for the **verified dedicated Global Link schema**, before/after initialization. These read-only queries expose counts, not contact data:

```sql
SELECT DATABASE() AS selected_database, VERSION() AS mysql_version;
SELECT 'categories' AS table_name, COUNT(*) AS row_count FROM categories
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'service_content_items', COUNT(*) FROM service_content_items
UNION ALL SELECT 'providers', COUNT(*) FROM providers
UNION ALL SELECT 'bank_service_details', COUNT(*) FROM bank_service_details
UNION ALL SELECT 'faqs', COUNT(*) FROM faqs
UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings;
SELECT migration, batch FROM migrations ORDER BY id;
```

Expected migration names: 0001_01_01_000000_create_users_table; 0001_01_01_000001_create_cache_table; 0001_01_01_000002_create_jobs_table; 2026_10_06_075942_create_public_catalogue; 2026_10_06_082727_extend_catalogue_for_admin_cms; 2026_10_06_132218_create_enquiry_management_tables; 2026_10_06_144624_add_lead_source_to_enquiries_table. Batch numbers may legitimately differ. Baseline counts apply to a fresh installation; existing edited/published data must not be reset merely to match them.

If the application has no lead-deletion UI, an owner with a verified backup can use a private transaction for **one exact previously recorded fictional lead**. Replace the placeholders with that verified QA identity; never use this against a real visitor or a name-prefix set:

```sql
START TRANSACTION;
SELECT id, reference FROM enquiries
WHERE id = QA_ID AND reference = 'QA_REFERENCE' AND name = 'QA_EXACT_NAME'
FOR UPDATE;
-- Continue only if the SELECT returns exactly the intended fictional row.
DELETE FROM enquiries
WHERE id = QA_ID AND reference = 'QA_REFERENCE' AND name = 'QA_EXACT_NAME';
SELECT ROW_COUNT() AS deleted_count;
-- COMMIT only when deleted_count is exactly 1; otherwise ROLLBACK.
```

Existing foreign keys cascade that lead's status history and notes. Repeat separately for the explicitly identified other QA lead if necessary. Do not delete all audit rows by the owner's administrator ID; preserve legitimate audits and only handle exact recorded QA audit IDs if a reviewed cleanup requires it. For the fictional service/image, verify exact IDs/slug/UUID and no remaining public/private references before deleting only those rows and the matching private cms/UUID.png. Preserve the real owner administrator and all other CMS media.
