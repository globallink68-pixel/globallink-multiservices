# Global Link Multiservice

Phase 1 public website, Phase 2 administrator CMS, Phase 3 enquiry/lead management Phase 4 database-grounded Gemini customer assistant and Phase 5 controlled conversational lead qualification. Independent React/Vite frontend, Laravel API and MySQL catalogue. No sibling project or database is used. Phase 5 is implemented; Phase 6 is deferred.

## Project layout

- `frontend/`: public website and separate lazy-loaded administrator workspace, tests and static build.
- `backend/`: public catalogue and protected cookie-session CMS APIs, migrations, seed data and tests.
- `docs/`: architecture, schema, administrator guide, hosting strategy and Phase 1–5 evidence.
- `scripts/`: guarded local database start and validation tools.
- `tools/`: ignored local PHP/Composer runtime and isolated MySQL data; never deploy or commit.

## Requirements

PHP **8.4+** with PDO MySQL, GD (JPEG/PNG/WebP support), mbstring, OpenSSL, ctype, DOM/XML, curl, fileinfo and tokenizer; Composer 2; MySQL 8; Node 22.12+ for development/build only. The committed dependency lock requires PHP 8.4 even though Laravel's general minimum can differ. No Node or Python production service is needed.

## Local setup

Use a new database installation/data directory dedicated to this project. Never point migrations at another project's database. This workspace already has its own MySQL instance bound to 127.0.0.1:3312, with databases `globallink_phase1` and `globallink_phase1_test` and a restricted app account. Credentials live only in ignored local files. The launcher can restart that already initialized instance; it does not initialize or overwrite data.

For a fresh checkout, create these two databases and a distinct app account with privileges only on them. Configure the database port as 3312 for the test safety guard. Use strong passwords; do not use an existing application's database or account.

1. In `backend`, run `composer install`. Copy `.env.example` to `.env`; enter the new database credentials, then run `php artisan key:generate`.
2. Copy `.env.testing.example` to `.env.testing`. Set a generated APP_KEY and credentials for the dedicated test database. Tests refuse any database other than `globallink_phase1_test` on port 3312.
3. Run `php artisan migrate --seed` once on the new development database. The initial seeder supplies 5 categories, 32 services, 8 provider labels and retailer/distributor document checklists. It creates no admin login. Do not routinely reseed later CMS-managed installations; missing starter records can be recreated.
4. Start the API: `php artisan serve --host=localhost --port=8012` from `backend`. In this prepared workspace the ignored PHP binary is `tools/php/php.exe` and Composer is `tools/composer.phar`.
5. In `frontend`, run `npm ci` then `npm run dev`. Open http://localhost:5175. Vite proxies `/api` to localhost:8012.

If the isolated database is stopped, run `powershell -File scripts/Start-Database.ps1` from this root. It uses the installed MySQL binary with this project's data directory and refuses a foreign process on its port.

## Checks and build

In backend: `php artisan test`, `php vendor/bin/pint --dirty --format=agent`, `composer validate --strict`, `composer audit`. In frontend: `npm test`, `npm run lint`, `npm run build`, `npm audit`. At root: `node scripts/secret-scan.cjs` and `git diff --check`. Full commands assume local environment files are configured. Test migrations affect only the dedicated test database.

The build output is `frontend/dist`, generated on demand and ignored by Git. Production is static assets plus a PHP API; see docs/HOSTINGER_DEPLOYMENT.md. No deployment has been performed.

## Scope and content

The public catalogue, filters/search, service details, providers, checklists, verified fees, FAQs, images and branding/contact settings are CMS driven. Visit `/admin/login` after running `php artisan admin:create business-email --name="Administrator"` from backend and entering a password at its hidden prompt. No default account is seeded. See docs/ADMIN_GUIDE.md for operating instructions.

Real supplied logo was unavailable as a filesystem asset during Phase 2. The temporary GL mark remains; Settings safely uploads/replaces it. Service pages and the homepage contact CTA submit consent-based enquiries; `/admin/enquiries` manages status/history/notes with server-side authorization. Public success returns only a reference; no public lead lookup exists. The public assistant retrieves published CMS facts and lets Gemini select references; Laravel renders only stored facts. Gemini never creates leads or accesses admin data. The assistant offers a separate controlled callback form; Laravel validates consent, review and explicit confirmation before reusing the Phase 3 workflow. Contact fields never go to Gemini. The normal enquiry form remains available.

The assistant defaults to disabled. Set `GEMINI_ENABLED=true` and `GEMINI_API_KEY` only in Laravel's private environment, with optional `GEMINI_MODEL` (default `gemini-2.5-flash-lite`) and `GEMINI_TIMEOUT` (default 12 seconds, clamped to 3–20). Provider failures show contact/enquiry fallback. Never use a VITE-prefixed key. Tests mock the provider; no paid/live API call is required. No local test key was available for live Gemini verification.

See docs/PHASE_5_REPORT.md for current validation, browser evidence, cleanup and limitations. Phase 1–4 reports remain historical evidence. Nothing has been pushed, merged or deployed.
