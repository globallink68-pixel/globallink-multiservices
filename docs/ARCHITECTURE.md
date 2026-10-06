# Architecture — Phases 1–4

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

Phase 5 is implemented; Phase 6 and later have not started. Schema extensions remain incremental migrations; do not duplicate catalogue content in frontend or AI prompts.

## Customer assistant

React's public-only floating widget → CSRF-protected POST `/api/chat` → `ChatRetrieval` scoped MySQL reads → Laravel HTTP client → Gemini structured fact-reference selection → server-validated references → escaped CMS fact cards and controlled enquiry link. GET `/api/chat/session` bootstraps CSRF. No chat read/history API or chat-content persistence exists.

Retrieval deterministically ranks published services under active categories from question/title/slug/provider matches, optional current published service slug and bounded user history. At most three services, 60 facts and 16,000 fact-text characters enter context. Relevant document/eligibility/process items, active verified service fees, active service/global FAQs, active associated provider information and allowlisted public contact settings are queried. No users, leads, notes, audit rows or private settings are queried. History helps resolve a service locally; it is not forwarded to Gemini as authoritative content.

The provider receives a JSON-only schema selecting up to 12 fact IDs plus a missing-information flag. Laravel rejects invalid/unknown references, extra generated prose, blocked/truncated/malformed outputs and provider failures. Only retrieved CMS strings are displayed; generated factual prose is never rendered. Missing requested kinds and sensitive claims receive conservative confirmation guidance. No tools, arbitrary SQL, external search, file access, admin API access or business writes are available to the model.

The key exists only in private Laravel environment/config and the provider authentication header. The endpoint is fixed HTTPS; the model name is validated. Requests have a three-second connection timeout and bounded total timeout, no automatic retries, fixed output budget and per-IP/session rate limits. Disabled/missing configuration and quota/network/provider errors return safe fallback. No additional production infrastructure or schema was added. CMS quality, bounded lexical matching, shared-host latency and unverified live-provider behavior remain limitations.

## Enquiry and lead management

Service/contact CTA → React EnquiryForm → same-origin CSRF bootstrap and POST `/api/enquiries` → StoreEnquiryRequest → EnquiryWorkflow → transactional enquiry/initial status history. A current published service under an active category is checked during validation and again inside the transaction. Browser service IDs cannot select an unavailable service; source paths must be `/`, `/services` or that service's canonical detail path. Arbitrary URLs, mismatched detail paths and browser timestamps/status fields are not stored.

Public responses contain only a generated GL-prefixed ULID reference and acknowledgement. There is no public list/detail/update endpoint. Form fields use bounded plain text, explicit consent and a hidden honeypot. Indian mobile numbers normalize optional +91/formatting; letters/invalid numbers fail validation. Named IP limits are 5/minute and 20/hour; a normalized-mobile HMAC key allows 3 submissions/10 minutes. A file-cache lock serializes concurrent mobile submissions, and an HMAC of mobile/service/message rejects duplicates for 10 minutes. No paid CAPTCHA, browser fingerprint or IP/user-agent field is added to lead storage.

Administrator list/detail/status/note endpoints reuse RequireAdministrator and web CSRF. Lists paginate 20, sort newest first and filter search/service/status/inclusive UTC dates. Search uses bound SQL with escaped wildcard characters. Detail excludes database IDs/fingerprint but includes necessary contact, service/source, consent evidence and append-only history/notes. Status writes lock the row and require expected_status to reject stale edits. All six allowed states, including reopening, are manual administrative decisions. Every changed status retains old/new status, actor/time and optional note. Notes are separate append-only rows. Read/status/note audits use fixed safe summaries without contact or message text.

Dashboard lead counts link to authorized filtered lists; no revenue is inferred. React escapes visitor/internal text and moves focus/viewport to public confirmation after submission. Single-host file cache/locks suit the planned PHP/MySQL deployment. Retention, multi-host spam controls, notifications, follow-up scheduling and exports are not implemented.


## Controlled conversational qualification (Phase 5)

Laravel adds a deterministic interest offer to chat replies using the retrieved published service context. Gemini's existing fact-ID-only contract stays unchanged. A separate React qualification component holds bounded contact fields in memory, outside chat turns/history. Visitors choose an available CMS service, give consent, inspect a server-validated summary and explicitly confirm before any enquiry is written.

Same-origin CSRF-protected POST `/api/chat/enquiry/review` validates through a child of StoreEnquiryRequest and derives the canonical service source path. It returns an opaque 40-character review token valid for ten minutes. Private file cache stores only payload HMAC/session hashes, never contact values or chat. One active review per session; replacement, cancellation or expiry revokes it. POST `/api/chat/enquiry/cancel` revokes the caller's review. Review/cancellation limits are 6/minute/session, 10/minute/IP and 40/hour/IP.

POST `/api/chat/enquiry` requires accepted consent, explicit confirmation, matching normalized fields and the same cookie session. A token lock serializes confirmation; retries of the same accepted review return the same public reference for ten minutes. The server calls EnquiryWorkflow with the fixed AI_ASSISTANT source, reusing service revalidation, mobile/IP limits, duplicate protection and atomic NEW/history/consent creation. No Gemini dependency exists on these three routes. Invalid or changed reviews return a safe conflict and require a new review. Browser state is cleared after success/cancel/unmount; no local-storage persistence or full conversation is added.

The incremental migration adds indexed enquiries.lead_source, default WEBSITE_FORM for existing rows and ordinary form submissions. Admin list/detail expose a source label; the existing authorized list supports a two-value source filter. Lead reads/status/notes retain their existing authorization and safe audits. The source records the controlled assistant UI channel, not proof that a live Gemini call occurred. No model tools, arbitrary SQL or new lead creation business logic were added.
