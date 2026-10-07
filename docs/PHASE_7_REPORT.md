# Phase 7 — manual Hostinger deployment preparation

**Goal: COMPLETE MANUAL DEPLOYMENT PACKAGE.** Actual Hostinger deployment, live production acceptance, live Gemini and SMTP verification are **MANUAL/PENDING**. This resumption continues from commit `b0d6d0b7de9c2b21f2833b7bd35cac6c8fd4c2ef` on codex/phase-7; no reset, revert, discarded work or phase restart occurred. The approved application rollback commit remains `410e6f28a57f5787b0dc88831ba3e952b766ae51`.

The owner supplied a screenshot of an active globallinkmultiservice.in domain in hPanel. This is evidence of account/domain ownership, not a verified PHP hosting plan, runtime or document root. In this manual-preparation resumption Codex did not access hPanel, request browser authentication, use SSH/SFTP/FTP, deploy, change DNS or modify the existing website. Earlier read-only production observations and the prior local release/bundle remain historical evidence; they are not live acceptance of this package.

## Deliverables

- Production target: **https://globallinkmultiservice.in**.
- Deployment ZIP: **dist/hostinger/globallink-production.zip**, with an adjacent SHA-256 receipt and package validation record. The exact size/hash and completed validation results are recorded below.
- Expanded staging under dist/hostinger contains the same intended payload. It is ignored by Git and retained as a deployment deliverable.
- Production environment template: **deployment/hostinger/production.env.example** and its packaged private backend copy. Required secret fields are blank placeholders; database/SMTP identity fields use REPLACE_WITH placeholders. The target URL and production/debug-off/secure-session settings are explicit. Gemini defaults disabled. Allowed host derives from APP_URL; only independently verified proxy IPs/CIDRs belong in TRUSTED_PROXIES.
- **deployment/hostinger/public_html.index.php** is the prepared fixed-root adapter. It loads maintenance/autoload/bootstrap from the private sibling globallink/backend and sets the Laravel public path to public_html. The normal private backend/public entry remains available for a configurable document root. Existing application behavior/security is unchanged.
- **scripts/Build-HostingerPackage.ps1** creates the production-only payload from approved runtime files, a separately validated no-dev vendor directory, built assets and the manual guide/checklist. It omits app tests/factories, real environment/data/media, logs and caches, and removes unnecessary vendor distribution test support before regenerating optimized autoload metadata. It refuses an existing output directory.
- **docs/HOSTINGER_DEPLOYMENT.md** now provides all 28 numbered manual steps, exact directory layouts, private command locations, expected results, bounded client checks, migration/seeding/admin creation, backup/cutover/rollback and redeployment procedures.
- **docs/HOSTINGER_MANUAL_CHECKLIST.md** provides checkboxes for every manual deployment/acceptance/cleanup step.

## Layout, runtime, database and operations

Preferred layout keeps globallink/backend and sibling frontend private, with the selected web root at backend/public. Fixed-public_html fallback puts globallink beside public_html and uploads only the prepared public contents into the web root. The ZIP itself, guide, .env, vendor, storage, database, backups and manifest stay private. If the account cannot provide private parent-directory access, stop and establish a supported PHP hosting layout; do not move all application files under public_html.

Required runtime: PHP ^8.4, PDO MySQL, mbstring, openssl, tokenizer, ctype, fileinfo, GD PNG/JPEG/WebP, DOM/XML/XMLWriter and locked Composer runtime requirements. Production vendor is included; Composer need not be available on Hostinger. A secure private PHP CLI/support execution method is still necessary for Artisan. Web/CLI versions, MySQL compatibility, memory, PHP temporary directories, Apache modules and real permissions remain owner checks.

The guide uses safe migrate --force after identity/backup/migration-status checks. Seven existing migrations must be Ran; no Phase 7 schema changes exist. CatalogueSeeder is used only for a verified empty installation and inserts missing records. Expected baseline: 5 categories, 32 services, 52 content items, 8 providers, 8 bank details, 4 FAQs and 10 settings. No administrator/test credential or fictional lead is packaged. The legitimate local enquiry/history and any edited CMS data require a private protected transfer if they form the initial production data source; seeding alone does not transfer them. No dump/contact data is placed in the package.

CMS media stays in private storage/app/private/cms, served through reference-gated controllers; no storage:link is required. Writable storage/bootstrap cache and PHP upload temp directories must be verified. The package retains Phase 6 .htaccess/.user.ini policies and self-origin CSP/host/TLS checks. Hostinger Force HTTPS and actual proxy/cookie/Apache enforcement are manual verification, not claimed tested here.

SMTP configuration is optional for current lead capture; credentials remain private. Gemini stays disabled until a server-only key/model/quota/outbound access is verified, with controlled failure handoff available. Both real SMTP and live Gemini remain pending. Config/route/view caches are generated only on the production host after real environment setup; business cache is not flushed. No worker/cron is required by current features.

The existing Marketing Agency website/database must have a verified recoverable backup before replacement. Guide/checklist cover private final backups and root/release/domain rollback, preserving APP_KEY/media/current database where compatible and reconciling post-backup enquiries before any database restore. No production backup or restore was performed.

## Local regression and safety

| Check | Result |
| --- | --- |
| Full Laravel | 108 tests passed, 1,356 assertions |
| Full React | 77 tests across eight files passed |
| TypeScript / lint / production build | Passed |
| Pint | Passed; adapter formatted |
| PHP syntax | 73 application/config/database/route/test/bootstrap/adapter files passed |
| Composer | Validation/platform/audit passed; no advisories |
| npm audit | Zero vulnerabilities |

Package and prepared-entry transport checks, final secret/diff checks, artifact size/hash and cleanup are finalized below. None constitutes actual Hostinger live acceptance. Practical limitations include real PHP-FPM/Apache/TLS/proxy settings, account folder/command availability, backups, secure credential entry, database transfer, live CMS/forms/CRM/browser acceptance, provider verification and traffic-aware QA cleanup.

The owner's manual steps remain required even when **PHASE 7 DEPLOYMENT PACKAGE READY: YES**. Package readiness does not mean the domain is deployed or production-qualified. No push, merge or additional phase is authorized or performed.

## Final package qualification

**PHASE 7 DEPLOYMENT PACKAGE READY: YES.** This is readiness of the manual delivery package, not actual deployment or live production acceptance.

Deployment ZIP: `dist/hostinger/globallink-production.zip` — **8,679,497 bytes** (about 8.28 MiB).

SHA-256: `A43184061C38E1623BC061894A3BD76F4D1C5A0961A0BDF5280573E3F32F7B50`.

The adjacent `globallink-production.zip.sha256` receipt and `PACKAGE_VALIDATION.json` are retained with the ZIP. The actual final archive was reopened and all **6,520 files / 6,526 entries** inspected. Required hidden files, private vendor/template/manifest and both public-layout asset targets were verified. No matched secret signatures, completed .env, QA records/credentials/screenshots, source maps, databases/dumps, logs, caches, node_modules, Git directories or local Windows binaries remain. Removed 33 vendor distribution test-support files, unnecessary metadata and seven Windows-only executable/batch helpers; optimized production autoload metadata regenerated successfully (4,759 classes). Runtime framework source, licenses and required vendor dependencies remain; the installed set matches the 76 locked production packages and passed production platform/audit checks.

Loopback/development-string inspection found **54 classified files**: two copies of the main bundle (two inert React Router localhost URL-construction defaults per copy), seven private application configuration files with environment-overridden defaults, 44 vendor defaults/examples/helpers and one manual guide reference. No application frontend localhost/test API endpoint is configured; requests use same-origin /api. These findings were reviewed and retained rather than changing vendor/runtime behavior to satisfy an indiscriminate string search. Real production environment configuration is mandatory.

The prepared fixed-public_html entry with the packaged no-dev vendor passed **212 local HTTP/security checks**: 188 checks covering all 32 service APIs and initial HTML metadata, private authorization/cache/index rules, CSRF, body limits, methods, filters, robots/sitemap/404s, plus 24 checks for homepage/catalogue/admin HTML, missing page and every hashed static asset. The run used the isolated local development database and explicit loopback forwarded HTTPS simulation; no Hostinger connection or real TLS/Apache qualification is claimed. The original preferred entry is preserved; its manifest targets were verified alongside the fallback. Apache/.user.ini enforcement remains a mandatory actual-host check.

Final Git-candidate secret scan and diff checks passed. All **15 protected local table hashes/counts** remained identical to the approved Phase 6 and Phase 7 starting snapshots, including the legitimate enquiry/history. No fictional lead/admin/media was created for these package checks. The local PHP process stopped; extracted vendor staging, PHP temporary directory, fake test disks, PHPUnit/TypeScript caches and frontend build were removed. Generated package caches/logs/views were cleared before sealing. Intentional delivery artifacts and the earlier source rollback bundle remain ignored locally. A local additional Phase 7 commit records the six source/documentation deliverables; its identifier is supplied in the completion message, with a clean working tree.

Actual Hostinger deployment: **MANUAL/PENDING**.
Live production acceptance: **MANUAL/PENDING**.
Live Gemini: **PENDING**.
SMTP production verification: **PENDING**.

Manual actions required: all 28 numbered guide steps and checklist, including verified old-site/database backup; host/private-root/PHP CLI readiness; private APP_KEY/database setup and protected data transfer; safe migrations/empty-only seeding; SSL/proxy/permissions/cache setup; actual desktop/mobile public/admin/assistant/SEO/security acceptance; exact fictional QA cleanup; final backup and recoverable rollback. No credentials or live host success are inferred from the supplied screenshot or package qualification.
