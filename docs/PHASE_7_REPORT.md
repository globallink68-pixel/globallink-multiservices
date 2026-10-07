# Phase 7 — Hostinger deployment preparation and live acceptance status

**PHASE 7 READY FOR REVIEW: NO — live deployment remains blocked.**

## Approved state and access

The initial branch was codex/phase-6, HEAD exactly `410e6f28a57f5787b0dc88831ba3e952b766ae51`, with a clean working tree and passing git diff --check. Branch codex/phase-7 was created directly from that approved commit. No approved application behavior, dependency or schema was changed.

The operator authorized `https://globallinkmultiservice.in` and reported an authenticated Hostinger hPanel session. The available Codex browser had no existing tabs/session; opening hPanel redirected to `https://auth.hostinger.com/login`. The tab was shown for private user sign-in. No password, key or database credential was requested, read, displayed, stored locally or committed. No local SSH config was present; actual account SSH availability could not be inspected without hPanel access. No new access was enabled.

**BLOCKED — an authenticated Hostinger session accessible to Codex is missing.** Consequently the selected hosting plan, actual document root, PHP-FPM/CLI runtime, database identity/credentials, backup capability and SSH status cannot be verified. Do not equate the operator's session in another browser with an accessible session here.

## Read-only production observations

On 7 October 2026, the authorized domain returned HTTPS 200 with title **Marketing Agency** and server header hcdn. HTTP returned 301 with Location set to the exact HTTPS root. Normal Node TLS certificate validation succeeded; the certificate reported expiry 23 November 2026 UTC. Public A lookup returned 93.127.173.206 and 88.222.243.110; NS lookup timed out. No DNS or domain changes were made.

These observations concern the existing site, not a deployed Laravel release. Only upgrade-insecure-requests CSP was observed on the root; Phase 6 CSP/HSTS/nosniff/frame protections were not verified on this existing response. Its hosting product/framework, files, databases and restore options remain unknown. This is a replacement-deployment target, not a verified empty installation. No existing site was overwritten.

## Safe preparation completed

- Retained the exact approved commit on codex/phase-6 as the application rollback point. Created and verified an ignored local Git bundle under tools/phase7/phase6-rollback.bundle. This is source recovery, **not** an existing production file/database backup.
- Rebuilt the approved frontend and verified all eight output files, hashed manifest entries and lazy assistant/qualification/admin chunks. No source maps, application mock URLs or credential signatures were found. Application fetches use same-origin /api.
- Two inert http://localhost defaults exist in React Router's bundled URL-construction code. Their surrounding code uses browser origin during browser navigation; there are no application localhost endpoints. Vendor code was not changed merely to satisfy a blanket text search. Actual production network verification remains pending.
- Staged approved application source outside the public root with a private manifest, public hashed assets and locked no-dev Composer dependencies. The release contains no production environment, database dump or legitimate visitor data; deploying code alone does not transfer that data.
- Updated HOSTINGER_DEPLOYMENT.md with account/runtime preflight, environment names without secrets, preferred and fixed-public_html layouts, private storage, cache commands, backup/restore, protected-data transfer, bounded live acceptance, exact QA cleanup and maintenance/rollback procedures.

## Regression and local verification

| Check | Phase 7 result |
| --- | --- |
| Full Laravel | 108 tests passed; 1,356 assertions |
| Full React | 77 tests across eight files passed |
| TypeScript, lint, production build | Passed |
| Pint | Passed; no PHP changes |
| Composer validation/platform/audit | Passed; no security advisories |
| npm audit | Zero vulnerabilities |
| Local PHP | 8.4.26 CLI; actual Hostinger PHP unverified |
| Production artifact inspection | Eight files checked; manifest targets exist; no source maps; two documented library fallback literals |
| Local protected data | All 15 protected table hashes/counts match the approved Phase 6 baseline |

Phase 7's final local transport rerun passed **188 HTTP/security checks**, including all 32 published service APIs/HTML metadata, conditional caching, authorization, CSRF, request bounds, methods, invalid filters, headers, robots and sitemap. These requests used the isolated local development database and are not production acceptance. Phase 6's production-like and desktop/mobile evidence remains historical application evidence only.

Production Composer installation completed with **76 locked no-dev packages**; platform requirements, audit and Laravel 13.34.0 CLI startup passed. The release ZIP contains **6,572 entries** and includes the required hidden Apache/PHP files and private manifest. Its 83 application/asset files passed a credential-signature scan. Runtime/environment/host-path adaptation still requires actual host verification.

Intentional ignored local artifacts retained for resumption:

| Artifact | SHA-256 |
| --- | --- |
| tools/phase7/globallink-phase6-release.zip (8,445,361 bytes) | B6ED534AD54203CDCB76F84867DDE9AA482EC89B5455B040B93A77203C7EAC15 |
| tools/phase7/phase6-rollback.bundle (1,100,747 bytes) | 2DA4A703181AD4A1719D2C1342602BEE2213779A1ABC62D50CDCD12258295611 |

Checksums also reside in tools/phase7/ARTIFACTS.sha256. Neither artifact was uploaded. The release ZIP is a preparation artifact, not a deployed release or database/media backup.

The local HTTP process stopped. Extracted release/dependency staging, source staging ZIP, frontend build, copied public assets, PHP temporary directory, fake test upload disks, PHPUnit result cache and TypeScript build cache were removed. No Phase 7 fictional user/lead/media records were created. All 15 local protected-data hashes still match both the Phase 7 starting snapshot and Phase 6 baseline. Final Git-candidate secret scan and diff checks passed; the documentation-only local commit leaves a clean working tree.

## Live deployment and acceptance gates

| Area | Status |
| --- | --- |
| Hostinger plan/runtime/extensions/PHP temp/upload limits | BLOCKED: accessible hPanel/host required |
| Existing production files/database backup | NOT CREATED: cannot inspect or back up the account; no overwrite permitted |
| Production database and seven migrations | BLOCKED: identity, backup and migration state unavailable; no production SQL run |
| Production environment/APP_KEY/database/SMTP | BLOCKED: private operator configuration and redacted verification required |
| Storage/media/upload paths | BLOCKED: actual layout, permissions and HTTP reference gates unverified |
| Document root/Apache/.user.ini | BLOCKED: actual host behavior unverified |
| Domain/TLS | Existing site resolves and validates HTTPS; Laravel host/proxy/cookie/mixed-content behavior unverified |
| Production config/route/view caches | NOT RUN on Hostinger |
| Public/admin desktop/mobile-web acceptance | BLOCKED: approved release is not deployed |
| SEO initial HTML/robots/sitemap | BLOCKED for Laravel release; existing root is the old Marketing Agency site |
| AI assistant / AI_ASSISTANT CRM | Local regression passed; live acceptance BLOCKED |
| Live Gemini | BLOCKED: no available server-side key/provider verification; no live call claimed |
| Gemini failure fallback | Local regression passed; production behavior BLOCKED |
| Production security acceptance | BLOCKED for deployed application; existing HTTP/TLS observations only |
| Production protected-data before/after comparison | BLOCKED: no database access; no production data modified |
| Production fictional QA records | None created; no production QA deletion required |

## Recovery and completion prerequisites

The exact pre-deployment application commit is `410e6f28a57f5787b0dc88831ba3e952b766ae51`. Preserve existing web files, private environment/media and production database in a verified private backup before cutover. Confirm the old site's recoverable domain/release binding and restore mechanism. No production backup timestamp/identifier is invented because no backup was taken.

Use the runbook to stage the private Laravel release and production environment, verify the dedicated MySQL identity and seven migrations, preserve the legitimate enquiry/CMS during any initial data transfer, generate only config/route/view caches, switch the verified root and run all requested live acceptance. Live traffic may create legitimate new leads: compare stable records and expected QA deltas rather than blindly restoring older whole-table state.

Rollback the application/domain binding to the verified previous release; retain the current database where compatible. Never apply an old dump over new enquiries or run blanket migration rollback. A database restore requires a tested, separately controlled recovery target and reconciliation of post-backup data.

No push, merge, hosting upload, domain change, environment mutation, production migration, native mobile app, redesign or additional phase occurred. SMTP and live Gemini remain optional verification items pending private operator availability; authenticated hosting access and recoverable backups are mandatory deployment gates.
