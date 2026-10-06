# Phase 6 — production hardening and pre-deployment QA

Status: **PHASE 6 READY FOR REVIEW: YES**. Local application qualification completed on 6–7 October 2026. No push, merge, deployment or Phase 7 work occurred.

## Baseline and scope

Branch: `codex/phase-6`, created directly from approved Phase 5 commit `df1cadb0a5901543337ce092426c706d3fc045e4`. This report belongs to the Phase 6 local commit; its final identifier is supplied in the completion message. Existing Phase 1–5 reports and functionality are retained. No dependency, database schema or major feature changes were introduced.

## Security hardening

Production requests fail closed for insecure TLS detection, debug mode, non-HTTPS APP_URL and unexpected hosts. Trusted proxies default to none and accept only explicit operator IPs/CIDRs; forwarded host is not trusted. Session encryption is enforced in production. API/error responses receive nosniff, DENY, referrer/permissions policies, compatible self-origin CSP and private/no-store rules; secure production requests receive HSTS. Cross-origin API access is disabled.

Public bodies are bounded to 16 KiB, administrator JSON to 1 MiB and media transport to 3 MiB. Existing field validation, CSRF, authentication, authorization, login/chat/enquiry limits, mobile submission locking and explicit persistence field lists remain covered by regression tests. Media is still decoded/re-encoded PNG, MIME/size checked and reference-gated; stored paths now must match the exact CMS UUID PNG shape. Apache rules deny dot/config/source/executable upload paths and permit immutable hashed static assets. Production PHP settings disable display errors and disclosure; actual host enforcement remains a deployment gate.

Production exceptions emit generic responses and minimal exception-type logs rather than SQL bindings, raw input or stack traces. Sensitive inputs are excluded from flash data. Provider keys remain backend-only. CRM/audit privacy rules remain intact. No password, key, OTP or token was placed in source, documentation or screenshots.

## SEO

Laravel now renders CMS-derived escaped title, description, canonical, Open Graph and Twitter metadata in the initial HTML, with the private Vite manifest supplying hashed assets. React keeps metadata current on navigation and removes stale private-page canonical/image tags. This is initial-head rendering, not full React server rendering. All 32 published service HTML pages were checked. Missing service/page URLs return actual 404/noindex responses; administrator routes and APIs are non-indexable. Canonicals strip tracking parameters and retain recognized category filters.

Dynamic sitemap contains 39 baseline URLs: homepage, catalogue, five active categories and 32 published services. Draft services and private routes are excluded. Robots blocks admin/private API paths while allowing public catalogue/settings/media retrieval needed for rendering. No unsupported ratings, reviews, prices, partnerships or structured organization claims were added. Production HTTPS domain and crawler behavior still require host verification.

## Accessibility and performance

Added route focus management, Escape/focus restoration for public/admin navigation and assistant, offscreen mobile admin navigation hiding, unique labels/IDs, focused error summaries and input error associations. Review, consent, status and reference-only success remain accessible. Confirmation-dialog focus wrapping and safe Cancel/Escape behavior were checked. Small muted text and breadcrumb contrast were corrected. Final rendered mobile service-page solid-color text scan returned no failures. Keyboard and responsive acceptance supports practical WCAG 2.1 AA work; this is not a certification or exhaustive screen-reader/contrast audit.

Assistant and qualification bundles are deferred; administrator code remains split. Images use explicit dimensions and asynchronous decoding/lazy loading where appropriate. Public JSON uses private conditional ETags with mandatory revalidation against current publication state; private/admin/lead data is never publicly cached. Query efficiency is covered by a bounded catalogue-query test; no speculative indexes or schema changes were needed.

Final main bundle: 295.63 kB / 92.23 kB gzip, compared with Phase 5's 306.38 kB / 94.41 kB gzip. Separate assistant: 6.52 / 2.59 kB gzip; qualification: 8.11 / 2.71; administrator: 41.84 / 10.96. These are build sizes, not measured Core Web Vitals or a host performance guarantee.

## Verification

| Check | Result |
| --- | --- |
| Full Laravel suite | **108 tests passed, 1,356 assertions** |
| Full React suite | **77 tests passed across 8 files** |
| TypeScript / lint / production build | Passed; final build includes contrast corrections |
| Pint | Passed, dirty files formatted with agent output |
| PHP syntax | 72 application/config/database/route/test/bootstrap files passed |
| Composer | Strict validation, platform requirements and audit passed; no advisories |
| npm audit | Zero vulnerabilities at verification time |
| Migration verification | All seven existing migrations applied in isolated development and test schemas; no Phase 6 migration; MySQL 8.0.46 |
| Laravel production caches | Config, routes and Blade views built successfully, then cleared without flushing application cache |
| HTTP/security | **222 passing checks**: 188 public/API/HTML/security, 25 production-like, four publication/revocation and five post-cleanup |
| Secret scan | Passed across final Git candidates; matched-signature scan plus source/config review |
| Diff whitespace | Passed before local commit |

HTTP checks covered all published services, initial metadata, ETag 304, private authorization/no-store/noindex, CSRF 419, oversized 413, method 405, invalid/injection filters 422, missing routes 404, headers, robots and sitemap. Production-like tests used a separate process with production/debug-off/HTTPS APP_URL and explicitly trusted loopback forwarded TLS headers. They verified fail-closed insecure requests, host rejection, HSTS, Secure/HttpOnly/Lax cookies, no CORS and sanitized errors. This was simulated TLS termination over local HTTP, not real HTTPS or Apache qualification.

An initial fallback-route regression was corrected while retaining the original API method expectations. An overlapping cache-generation/HTTP rerun was discarded; the final 188-check rerun passed after caches were cleared. PHP's initial local temporary-directory configuration also disrupted large requests/uploads; isolated QA server flags fixed this without changing project environment files or bundled PHP configuration. Host PHP temporary storage must be verified separately.

## Browser acceptance

Desktop 1280×900 and responsive mobile web 390×844 passed public navigation, catalogue/detail, keyboard focus, assistant opening/closing, controlled qualification, edit/review/fresh confirmation and reference-only success. With Gemini disabled, failed/unavailable provider behavior offered the team-contact flow; ordinary enquiry submission also worked.

Desktop administrator acceptance covered login, dashboard, filtered AI_ASSISTANT CRM, consent/source, NEW history, CONTACTED status change and internal note; CMS service editing, image upload, preview, publish/unpublish and reference-gated media; providers, FAQs, settings, audit summaries and logout. Mobile administrator navigation and public menu Escape/focus behavior passed. Private pages had no canonical/indexable metadata and logged-out access returned to login.

Evidence contains only fictional QA details:

- [Desktop review](previews/phase6-review-desktop.png)
- [Filtered desktop CRM](previews/phase6-crm-desktop.png)
- [Mobile review](previews/phase6-review-mobile.png)

## Protected data and QA cleanup

A pre-QA in-memory count/SHA-256 snapshot of 15 protected tables was compared after guarded cleanup. **All 15 table hashes and counts matched exactly.** The original visitor enquiry/history was preserved unchanged. Baseline remains five categories, 32 services, 52 content items, eight providers, eight bank details, four FAQs and ten site settings; existing visitor data was not printed in the report or screenshots.

Removed exactly three fictional leads with dependent history/notes, one temporary administrator and its audit/session rows, one fictional service and one uploaded private image. Isolated test enquiry/user/history/note/audit/media tables are empty. Removed QA input image, PHP temporary directory, fake test upload disks, PHPUnit result cache, TypeScript build cache, frontend build and copied public assets. QA web processes stopped and browser viewport restored. Generated config/route/view caches were cleared. No temporary administrator, fictional lead, credentials, fixture upload, build or temporary configuration remains. Retained screenshots are intentional review evidence.

## Hostinger preflight and limitations

[Hostinger deployment checklist](HOSTINGER_DEPLOYMENT.md) now covers PHP/extensions/MySQL, private directory layout, Vite manifest/assets, writable storage and PHP temporary directories, production environment/TLS/proxies/cookies, private media, optional mail, Gemini isolation, cache generation, cron needs, backups and rollback. [Security notes](SECURITY.md), README and architecture are updated.

**Live Gemini verification: BLOCKED — no live key available; no live provider call was required or claimed.** Disabled/failure handoff and AI_ASSISTANT CRM integration passed automated/browser checks. Real provider output, quota and outbound connectivity remain operator verification tasks.

Phase 7 prerequisites: explicit deployment authorization; verified Hostinger plan/PHP 8.4/extensions/MySQL and access; production domain/TLS and proxy addresses; Apache/LiteSpeed/.user.ini enforcement; private secrets and administrator bootstrap; writable PHP storage; tested private backup/restore and release rollback; actual-host security/browser qualification. Enable Gemini only after private operator verification. Mail is optional for current capture; no worker/cron is currently needed. Single-host file cache is supported; multi-server coordination is deferred. No native mobile application or full SSR was added.

Working tree is expected clean after this report's local commit. Production builds must be regenerated for deployment because QA build artifacts were deliberately removed.
