# Phase 5 — Controlled AI lead qualification and conversational handoff

## Baseline and scope

Created `codex/phase-5` from the clean approved Phase 4 commit `a2dc4ef2a2e9401444122bb01fc257aede059452`. This continues only Global Link Multiservice; no sibling project/database was used. Phases 1–4 functionality and their tests are preserved. No push, merge, deployment, Phase 6, Flutter, APK or mobile application work was performed. Responsive web only; dependencies/lockfiles are unchanged.

## Implemented flow and trust boundary

Chat service interest → controlled callback offer → separate contact form → explicit consent → Laravel-validated structured review → explicit visitor confirmation → existing EnquiryWorkflow → existing admin CRM.

The offer is deterministic Laravel matching of the current question and already retrieved published CMS service context. Gemini retains its Phase 4 fact-ID-only selection schema; it never collects lead fields, creates records, chooses database mutations or accesses admin APIs. The model has no tools, arbitrary SQL, privileged data or write path. A visitor can also select Request team contact without waiting for Gemini. Normal website enquiry forms remain available.

React holds only bounded name/mobile/optional email/state/city/service/short requirement/consent fields in a separate component. Known service slugs are resolved against the real public catalogue; unavailable context is not preselected. The privacy notice says not to provide Aadhaar/PAN numbers, bank details, passwords or OTPs. These contact fields are never added to chat questions, history or the provider payload. Arbitrary visitor questions remain subject to the existing warning and Phase 4 bounds; this does not claim automatic sensitive-data detection in free text.

The reviewed summary shows service, name, mobile, optional email, location, requirement and consent. A separate explicit confirmation checkbox enables Send. Editing cancels the prior review and requires a new review/confirmation. Synchronous client locking and disabled busy controls prevent accidental double submission. Successful submission clears contact values and displays only a public GL reference and acknowledgement, without a lead ID or unnecessary contact echo. Cancel/unmount discards component state; no local-storage persistence is introduced.

## API, state and reused business rules

| Route | Behavior |
| --- | --- |
| POST `/api/chat/enquiry/review` | Validate contact fields/consent/honeypot/published service; derive canonical source; return structured summary and opaque review token; no enquiry write |
| POST `/api/chat/enquiry` | Require consent, accepted confirmation and same reviewed fields/session; reuse existing Phase 3 creation; return reference/message only |
| POST `/api/chat/enquiry/cancel` | Revoke the caller's review; no lead write |

All routes use existing web cookie sessions and CSRF. No public lead read/list/update route is added. AssistantEnquiryRequest extends StoreEnquiryRequest, including mobile normalization, limits, service availability and plain-text validation. Source paths, browser lead sources, prompts/history and unknown/sensitive extra fields are rejected; the canonical source comes from trusted CMS. Service availability is rechecked at confirmation and by the existing transaction.

Review tokens are 40 random alphanumeric characters, expire after ten minutes and are session bound. Cache keys hash tokens; entries contain only an HMAC of the exact normalized fields and a session hash, not contact values or chat. There is one active review per session; replacement/cancellation/expiry revokes old reviews. An atomic token lock serializes confirmation. Same confirmed-token retries return the same reference for ten minutes; changed fields/session are denied. Cache reset or expiry requires a new review.

The final controller calls EnquiryWorkflow with fixed AI_ASSISTANT source. Existing mobile/IP throttles, honeypot validation, duplicate HMAC, published-service lock/revalidation and atomic enquiry/initial NEW history creation are reused. Review/cancel limits: 6/minute/session, 10/minute/IP, 40/hour/IP. Final submission shares the Phase 3 limits: 5/minute/IP, 20/hour/IP and 3 successful enquiries/10 minutes/mobile. Duplicate mobile/service/message content is rejected for ten minutes. No duplicated lead business logic, model writes, paid CAPTCHA or new infrastructure is added.

## Schema and CRM integration

Incremental migration `2026_10_06_144624_add_lead_source_to_enquiries_table` adds indexed VARCHAR(20) lead_source with WEBSITE_FORM default. Existing rows and normal form submissions receive WEBSITE_FORM; the controlled assistant workflow uses AI_ASSISTANT. Existing service FK, consent version/time, server timestamps, NEW status and initial history remain intact. There are seven migrations and 23 tables; no conversation/review table.

Admin list/detail show Website form or AI assistant. The existing list gains a strict two-value source filter, preserving service/status/search/date filters and newest-first pagination. Authorization, status transitions/history, notes and safe audits stay in the original CRM. No revenue, AI score, automated conversion or qualification guarantee is invented. AI_ASSISTANT identifies the controlled UI channel; it is not evidence of a live Gemini call or a verified applicant.

No full Gemini prompt/response or conversation history is stored on the lead. Only the visitor's expressly submitted requirement is saved. Source path is a supported CMS service path, not an arbitrary URL. Fixed safe admin audit summaries omit contact fields/messages. Keys/passwords/OTPs and full payloads are not logged by these changes.

## Final validation evidence

| Check | Final result |
| --- | --- |
| Laravel full Phase 1–5 regression | **94 tests / 843 assertions**, passed; 15 new qualification tests |
| React full Phase 1–5 regression | **70 tests / 6 files**, passed; 13 new qualification/offer/CRM-source tests |
| Live HTTP/security | **162 checks**, passed: 102 public catalogue/site regression/minimization; 52 actual CSRF/session/review/confirmation/replay/spam/CRM/logout checks; 8 post-cleanup checks |
| TypeScript/lint/build | `tsc -b`, Oxlint and Vite passed; 33 modules transformed |
| PHP syntax/Pint | **66 PHP files**, no syntax failures; Pint `--dirty --format=agent` passed |
| Migration | Guarded isolated test rebuild/seed, source-column rollback and reapply passed; legacy row retained its values and received WEBSITE_FORM; disposable test fixture removed |
| Composer | Strict validate, platform checks and audit passed; no vulnerability advisories |
| npm | Audit passed; **0 vulnerabilities** |
| Secret/whitespace | Secret scan of **145 Git candidate files** and staged `git diff --check` passed; no keys/credentials/QA tooling staged |

Laravel covers deterministic interest/injection without writes; review-before-confirmation; required consent/mobile/email/honeypot; unknown/sensitive fields; invalid/unpublished/inactive services; service/field/session substitution; cancellation/replacement/expiry; idempotent replay; reused duplicate guard; hash-only cache/no chat persistence; session/minute/hour review limits; shared submission limits; parallel lock; admin-only source filtering and ordinary-form spoof prevention; real CSRF; mocked grounded Gemini and quota failure during handoff with independent successful submission. All inherited provider timeout/error/guardrail/RBAC/CRM tests remain.

React covers trusted preselection, unavailable context, missing consent, explicit confirmation, reference-only success, cancellation and unmount revocation, edit/new confirmation, plain-text XSS rendering, validation/conflict feedback and rapid double-submit prevention. Chat intent alone creates no lead; contact data never enters `/api/chat`. CRM source labeling/filtering is tested alongside all inherited UI functionality. One ambiguous source test selector was corrected to target the table cell rather than also matching its dropdown option; no production behavior or existing assertion was weakened.

Live HTTP checks exercised the ordinary Laravel server with Gemini disabled, real cookies/CSRF and this project's MySQL only. They verified all 32 service details and public site data, minimal outputs, missing confirmation, changed payload/session denial, idempotent replay, existing duplicate rejection, validation/honeypot, review session throttle, shared submission throttle, anonymous/private reads, canonical source/NEW history in admin CRM, source filter tampering and logout denial. Counts include only fully passing integration runs. Provider behavior is mocked in automated tests; no live provider success is fabricated.

## Browser acceptance

Desktop **1280 × 900**: on Bank CSP, ask “I want to apply for Bank CSP” with Gemini disabled. Safe provider fallback still includes the trusted service-specific contact offer. Accept; fill fictional fields/consent; review shows Bank CSP and contact summary. Send is disabled until the separate confirmation. Confirm; success shows only a public reference. Sign into a disposable QA admin; source-filtered CRM contains the same reference/service as AI assistant, NEW history and consent/time. Existing NEW → CONTACTED → FOLLOW_UP transitions and an internal note worked. Sign out; reopening the detail routes to login. Independent HTTP read after logout returns 401.

Mobile **390 × 844**: Request team contact on Retailer ID resolves the actual public service without requiring a chat/provider call. Fictional fields and consent produce the structured summary; Edit retains fields and requires a new review and explicit confirmation. Submission produces reference-only success. Cancel of a new callback request restores the assistant. The original Phase 3 Retailer ID form also submits with Gemini disabled. Responsive CRM distinguishes the mobile assistant lead from the Website form lead. The review panel remains within the viewport (approximately 12.8px–363.2px; document width 375px); summary, consent and controls are visible/readable and scrollable.

Safe fictional acceptance JPEGs: `docs/previews/phase5-review-desktop.jpg`, `phase5-review-mobile.jpg`, `phase5-crm-desktop.jpg`. They contain no API key or sign-in credentials. Browser viewport override is reset after acceptance.

**Live Gemini verification: BLOCKED — no configured/available Gemini test key. No live/paid call was made. Real account quota, model behavior and provider compatibility remain unverified. Mocked-provider regression passed; actual disabled-provider handoff and ordinary form submission passed in browsers.**

## Resumed final validation — 6 October 2026

Resumed the existing staged Phase 5 implementation on `codex/phase-5`; no branch reset, implementation restart or production code change. The provider test callback correctly returns `PromiseInterface`. The final full Laravel rerun passed **94 tests / 843 assertions** and React passed **70 tests / 6 files**. Separate TypeScript, lint, production build (33 modules), Pint, strict Composer validation/platform requirements, Composer audit, npm audit (zero vulnerabilities), and the 145-file secret scan passed. An initial unsupported test-runner option was removed; an initial run had two database connection errors because the isolated MySQL instance was stopped. The guarded project launcher started it, and the subsequent complete suite passed.

Existing 162 HTTP/security checks, migration rollback/reapply evidence and desktop/mobile screenshots remain applicable: the last correction only changed a test mock return annotation. No additional browser acceptance or live Gemini call was needed or performed. Development migration status confirms all seven migrations applied. Cleanup reinspection found zero users, enquiry notes, audit records and authenticated sessions. One actual visitor enquiry and its initial history were retained; it is not a fictional QA lead. Gemini remains disabled with no configured key. No temporary QA helpers/configuration were found. Generated build output, TypeScript build information and PHPUnit result cache from this rerun were removed. Final whitespace checks and local commit/clean-tree verification follow; the commit identity is supplied in the final response.

## QA cleanup and production limitations

Development received only its incremental migration; rebuild/rollback operated only on globallink_phase1_test. Isolation guards checked database name, port 3312 and this project's tools/mysql-data directory. Four fictional leads and their cascading history/notes, one disposable account and its audits/session were removed using exact QA identity checks. All **15 protected tables** match the post-migration pre-QA snapshot byte-for-byte. No existing CMS, contact, account or non-QA record was removed/altered. Temporary credentials, snapshot/migration helpers and data, generated Vite assets, TypeScript build information and PHPUnit cache were removed. Private pre-existing runtime/dependencies/environment are retained; no temporary provider configuration was installed.

English interest matching is lexical and conservative, not semantic scoring or guaranteed multilingual qualification. Visitors supply the requirement themselves; no chat-derived personal details or model qualification scores are saved. Ten-minute review/replay/duplicate windows are intentionally bounded; refreshed sessions, cache clears or abandoned reviews require a new review. A token permits safe short-window retry but is not a durable receipt retrieval portal. One active review per session can invalidate another tab's review. Single-host file cache requires private writable storage and real-traffic limit tuning; multi-host coordination is deferred.

Production Hostinger migration/API/static-bundle ordering, HTTPS/cookie/proxy behavior, outbound provider access, latency, broader accessibility and key-enabled Gemini verification remain pending. Existing CMS accuracy and provider data-use review requirements remain. Lead retention/correction/removal policy and operational follow-up are operator responsibilities; no automatic retention purge, notifications, assignments or new CRM was added. No mandatory paid infrastructure, model write tools or arbitrary SQL were introduced.

## Local delivery

26 intended files: backend request/controller/review/migration/test and integrations; responsive React qualification/offer/CRM-source UI and tests/styles; README plus architecture/database/admin/hosting documentation; this report and three safe previews. Historical phase reports and dependency lockfiles are unchanged. Local commit/hash and final clean-tree confirmation are supplied in the final response. No push, merge or deployment; stop after Phase 5.

**PHASE 5 READY FOR REVIEW: YES**
