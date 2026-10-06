# Architecture — Phases 1–3

## Boundaries

A completely new repository and isolated database under this project root. React 19 + TypeScript + Vite render the marketing site and a separate lazy-loaded administrator workspace. Laravel 13/PHP 8.4 exposes public reads and protected CMS writes from MySQL. Development uses localhost:5175 and localhost:8012 with a Vite API proxy; production assumes a single HTTPS origin with static frontend assets and a PHP-backed /api path.

No Node/Python server, Redis, paid CMS, cloud platform, vector store or third-party runtime service is required. Composer and Node are install/build tools. Boost/Pint/PHPUnit and browser test libraries are development tooling. Framework job/cache tables are scaffold infrastructure, not an implemented background-worker requirement; runtime uses synchronous queue and file cache.

## Request flow

Browser -> React router -> /api/site or /api/services -> Laravel controller -> scoped Eloquent/bound queries -> MySQL -> explicit resource DTO -> escaped React text.

- GET /api/site: allowlisted public settings, active categories, active global FAQ.
- GET /api/services: published services under active categories, optional validated category slug, stable ordering; maximum 100 records.
- GET /api/services/{slug}: the same publication scope plus ordered sections/content, active verified fees, active provider details and active service FAQ.
- GET /api/media/{uuid}: images currently referenced by public branding, published services under active categories or active providers associated with those services. Draft/unreferenced media returns 404.

Unknown query parameters are rejected on the catalogue list. Slugs never become SQL or file paths. Public reads are limited to 90 requests/minute per IP. Internal flags, timestamps, users and arbitrary settings are excluded. Service identifiers are public catalogue identifiers, not credentials.

## Frontend

One dynamic detail component supports every service. Homepage featured cards, category navigation, services, FAQ, public contacts and checklists come from the API. Editorial marketing copy and native SVG/CSS artwork belong to the design system. Empty optional detail groups disappear. Prices use integer paise from the API and INR display formatting; no prices are seeded. Async requests are aborted and stale responses ignored on route changes. Loading, error, retry and empty states are visible.

Semantic sections/headings, focus indicators, skip link, native FAQ disclosure, responsive navigation, readable cards and reduced-motion CSS form the initial accessibility foundation. No third-party web font or image download is needed. Service titles/meta descriptions are set on navigation. Full SEO and accessibility/performance audits remain Phase 6.

## Security and publication

CMS text is rendered as escaped text; rich HTML is not executed. Money requires active and verified flags before public exposure. Provider names are editable labels and carry a no-partnership disclaimer. Checklists contain no submitted identity documents or payment instructions. API secrets are never returned, including settings incorrectly marked public but absent from the allowlist.

Production requests fail closed if APP_DEBUG is enabled or HTTPS is absent. Configure a trusted TLS proxy deliberately if hosting requires it; do not blindly trust arbitrary forwarded headers. Response headers include nosniff, DENY framing and a conservative referrer policy. Public JSON is no-store. File cache throttling suits one PHP host; multi-host operation is outside this scope.

## Administrator CMS

`/api/admin` uses Laravel web middleware for encrypted database sessions and CSRF validation. Session bootstrap/login are authentication endpoints; every CMS operation, logout and private media preview requires RequireAdministrator. Guests receive 401 and authenticated non-administrators 403. Users default to is_admin=false; no public registration exists. Login requires email/password plus the flag, regenerates the session and limits IP/email attempts with an outer route throttle. Password hashes are excluded from API responses. Production forces Secure and HttpOnly cookies with SameSite=Lax. CSRF tokens remain in frontend module memory; no localStorage authentication exists.

Service saves validate bounded nested arrays and update base content and ordered children in one transaction. Child IDs cannot select unrelated records; only explicit fields are inserted for the selected service. Publication changes use deliberate in-page confirmation. Category/service slugs lock after creation. Categories/providers/FAQs deactivate and services unpublish rather than deleting base records. Audit entries have fixed safe summaries, actor, action, entity ID and time, excluding submitted content and credentials.

JPEG/PNG/WebP uploads require actual server MIME/extension checks and GD decoding, with 2 MB input and 4-million-pixel limits. PNG re-encoding strips metadata; images scale to at most 1800 pixels on the longest edge. UUID files reside in private filesystem storage; controllers authorize delivery with nosniff and sandbox CSP. No storage symlink/paid service is needed. GD is a Composer platform requirement.

Public components consume CMS images, CTA text, optional-document flags, provider overrides/notes/disclaimers, settings, footer/social links and category/service SEO. Empty groups disappear. Dashboard metrics are actual catalogue counts with recent safe audits and optional missing-image attention. Audit lists paginate 30 rows, admin services cap at 250 and public service lists at 100.

## Subsequent phases — not implemented

4: Laravel-only Gemini integration with database-grounded context, budget/rate/history limits, timeout and fallback; no model access to arbitrary SQL.
5: structured lead capture through normal validated enquiry services.
6: comprehensive security, SEO, accessibility and performance QA.
7: verified Hostinger deployment package, migration/backup/restore procedure and HTTPS acceptance.

Phase 4 and later have not started. Schema extensions remain incremental migrations; do not duplicate catalogue content in frontend or AI prompts.

## Enquiry and lead management

Service/contact CTA → React EnquiryForm → same-origin CSRF bootstrap and POST `/api/enquiries` → StoreEnquiryRequest → EnquiryWorkflow → transactional enquiry/initial status history. A current published service under an active category is checked during validation and again inside the transaction. Browser service IDs cannot select an unavailable service; source paths must be `/`, `/services` or that service's canonical detail path. Arbitrary URLs, mismatched detail paths and browser timestamps/status fields are not stored.

Public responses contain only a generated GL-prefixed ULID reference and acknowledgement. There is no public list/detail/update endpoint. Form fields use bounded plain text, explicit consent and a hidden honeypot. Indian mobile numbers normalize optional +91/formatting; letters/invalid numbers fail validation. Named IP limits are 5/minute and 20/hour; a normalized-mobile HMAC key allows 3 submissions/10 minutes. A file-cache lock serializes concurrent mobile submissions, and an HMAC of mobile/service/message rejects duplicates for 10 minutes. No paid CAPTCHA, browser fingerprint or IP/user-agent field is added to lead storage.

Administrator list/detail/status/note endpoints reuse RequireAdministrator and web CSRF. Lists paginate 20, sort newest first and filter search/service/status/inclusive UTC dates. Search uses bound SQL with escaped wildcard characters. Detail excludes database IDs/fingerprint but includes necessary contact, service/source, consent evidence and append-only history/notes. Status writes lock the row and require expected_status to reject stale edits. All six allowed states, including reopening, are manual administrative decisions. Every changed status retains old/new status, actor/time and optional note. Notes are separate append-only rows. Read/status/note audits use fixed safe summaries without contact or message text.

Dashboard lead counts link to authorized filtered lists; no revenue is inferred. React escapes visitor/internal text and moves focus/viewport to public confirmation after submission. Single-host file cache/locks suit the planned PHP/MySQL deployment. Retention, multi-host spam controls, notifications, follow-up scheduling and exports are not implemented.
