# Phase 3 — Enquiry and lead management

Validated locally on 6 October 2026. Branch: `codex/phase-3`, created directly from approved Phase 2 commit `7848d49853dd4ce47311d60d5cfe4afe8a82f734`. Phases 1/2 functionality is preserved. No push, merge or deployment was performed. Phase 4/Gemini/AI was not started.

## Architecture and public integration

Every published service detail page includes the enquiry form with its service automatically selected and read-only. Homepage/contact CTA opens a service selector. Name, Indian mobile, optional email, state, city/district, service, message and explicit consent are collected. Browser submissions bootstrap a CSRF session and POST same-origin with the token. Successful responses contain only a public `GL-` ULID reference and confirmation message; numeric lead IDs and personal data are not echoed. Values are cleared after success. The confirmation scrolls into view and receives keyboard focus, including on mobile.

`StoreEnquiryRequest` validates bounded fields, consent, mobile normalization, honeypot and control characters. The selected service must be published and its category active. Source is stored as a bounded relative path, validated against `/`, `/services`, or `/services/{selected-service-slug}`; arbitrary URLs, query strings, mismatched service paths and administrative paths are rejected. Service availability is checked again inside the persistence transaction. Time, consent version, initial status and reference are server-generated; extra browser fields cannot override them. Validated source paths identify the submitting page, not independently proven navigation or location.

`EnquiryWorkflow` creates the lead and initial NEW history atomically. Existing CMS public service availability, session authorization, admin API client and audit service are reused. No external service or new dependency is required.

## Schema and workflow

The sixth migration adds three normalized tables, bringing the database to **23 tables including the migration ledger**:

- `enquiries`: unique public reference, service FK, bounded contact/location fields, plain-text message, validated source path, server consent time/version, current status, timestamps and keyed duplicate fingerprint. Indexes support status/date, service/date, creation date and duplicate detection.
- `enquiry_status_history`: enquiry FK with cascade, previous/current status, nullable administrator FK with null-on-delete, optional internal note and server timestamp; indexed by enquiry and ID.
- `enquiry_notes`: enquiry FK with cascade, nullable administrator FK with null-on-delete, append-only plain-text body and timestamp; indexed by enquiry and ID.

Service deletion is restricted while leads reference it. Unpublishing a service preserves historical leads and their service association. Statuses are NEW, CONTACTED, FOLLOW_UP, QUALIFIED, CONVERTED and CLOSED. Administrators can choose any different supported status, including reopening; no unrequested directed transition graph is imposed. Updates lock the lead, require its expected current status, reject stale changes with 409 and append history in the transaction. Notes are appended independently. History records actor display names and timestamps without disclosing account email addresses.

## Routes and administration

Public web/CSRF routes:

- GET `/api/enquiries/session` — CSRF bootstrap only.
- POST `/api/enquiries` — create only, returning a public reference.

Administrator-only routes:

- GET `/api/admin/enquiries` — paginated newest-first list; search, service, status and inclusive UTC date filters.
- GET `/api/admin/enquiries/{reference}` — explicit detail DTO, history and notes.
- PATCH `/api/admin/enquiries/{reference}/status` — expected-status update and optional note.
- POST `/api/admin/enquiries/{reference}/notes` — append internal note.

React `/admin/enquiries` provides list, contact information, filters, pagination and detail navigation. Detail provides originating service/path, consent, visitor message, status updates, notes and history. The existing dashboard shows real New, Follow-up, Qualified and Converted counts, linked to filtered lists. All six statuses are counted server-side. No revenue is invented. API route inventory contains **33 routes**.

## Security and privacy

Guest admin requests return 401; authenticated non-administrators return 403. Authorization precedes lead reads and writes. No public list, detail, status or notes API exists. Public catalogue/settings responses exclude enquiries. Admin list/detail use explicit field selections; internal enquiry IDs and duplicate fingerprints are omitted. Unknown filters, malformed references, numeric ID substitution and invalid service filters are rejected.

Web CSRF applies to public and admin mutations. Submission limits are five per minute and twenty per hour per IP using independent keys, plus three successful submissions per ten minutes per keyed mobile. A file-cache atomic mobile lock reduces simultaneous/rapid submissions. Identical mobile/service/message submissions within ten minutes receive 409. Honeypot and field limits need no paid CAPTCHA. Contact details are not stored in browser persistent storage. Duplicate/rate-limit mobile keys are HMAC-derived; IP is used by throttling rather than stored in lead records.

Visitor messages and internal notes remain plain text and are escaped by React. Test payloads containing HTML/script markup produce text, not executable DOM. Queries bind search terms and escape LIKE wildcards. Existing audit records lead viewed/status_changed/note_added using action/entity/ID and fixed summaries; contacts, visitor text, note bodies and credentials are not added to audit summaries. Operator-controlled database/backups must remain private.

## Exact validation evidence

| Check | Final evidence |
| --- | --- |
| Laravel full regression | **61 tests / 441 assertions**, all passed; includes all inherited Phase 1/2 tests and 20 new enquiry/admin tests |
| React full regression | **46 tests / 4 files**, all passed; includes 15 new form/CRM tests |
| Live HTTP/security | **251 checks**, all passed: 40 public/guest checks, 138 authenticated/workflow/catalogue checks and 73 post-cleanup checks |
| TypeScript / lint / production build | `tsc -b`, Oxlint and Vite passed; 31 modules transformed |
| PHP formatting / syntax | Pint `--dirty --format=agent` passed; syntax checks passed for **56 PHP files** |
| Migrations | Isolated test DB fresh rebuild/seed, sixth-migration rollback and reapply passed; **6 migrations / 23 tables** |
| Composer | Strict validation/platform checks passed; final audit reported no vulnerability advisories |
| npm | Final audit reported **0 vulnerabilities** |
| Secrets / diff | **123 candidate files** scanned; no private-key/token/non-empty environment-secret patterns found; `git diff --check` passed |

Focused Laravel tests cover successful reference-only submission, consent, bounds, malformed mobile, honeypot, controls, inactive/unpublished services, source substitution, server field ownership, duplicates, minute/hour/mobile limits and real CSRF rejection/acceptance. Admin coverage includes guest/non-admin authorization, DTO minimization, status history, stale updates, all supported statuses/reopening, notes, escaped markup, search/filter/date behavior, tampered IDs/filters, historical service accuracy and privacy-safe audit behavior. React tests cover service binding/homepage selection, consent, CSRF, errors, duplicate/rate-limit feedback, no submission after failed bootstrap, success focus/clearing, authorized CRM behavior, filter/pagination, stale reload, dashboard links, safe rendering and logout.

Live HTTP checked cookie/CSRF behavior, guest read/write denial, duplicate/spam responses, actual admin list/detail/history/notes and stale conflicts, filters, audit minimization, inactive-service rejection, historical detail availability, logout denial and all 32 existing public service details. Bank CSP was temporarily unpublished and then restored exactly during cleanup.

## Browser acceptance

Desktop **1280 × 900**: Bank CSP page → fictional consent enquiry → reference success → administrator login → dashboard/list/detail association → NEW → CONTACTED → FOLLOW_UP → internal note → all three history entries → logout → direct detail redirected to login.

Mobile **390 × 844**: service form bound to Bank CSP; invalid mobile showed useful validation without discarding fields; corrected submission succeeded. Administrator dashboard/detail, two status changes, internal note and history passed. After logout, direct detail showed login and no lead data. Homepage CTA/service selection submission also succeeded. Its success reference was focused and visible at approximately 343px from the top of the viewport. Measured page width was 375px, within the 390px viewport. Confirmation text contrast was corrected and visually verified. Captured browser warning/error logs were empty. Temporary viewport override was reset.

Evidence JPEGs contain only fictional QA data and no sign-in credentials:

- `docs/previews/phase3-enquiry-mobile.jpg`
- `docs/previews/phase3-lead-desktop.jpg`
- `docs/previews/phase3-lead-mobile.jpg`

These depict the acceptance state before cleanup; none of these leads remain in the development database.

## QA cleanup and preservation

Only this project's isolated MySQL instance on port 3312 was used: development `globallink_phase1` and test `globallink_phase1_test`. Cleanup verified database name, port and server datadir before acting. Four disposable leads were identified by exact QA name prefix and approved fictional mobile allowlist, then removed with cascading histories/notes. The sole temporary administrator, its authenticated sessions and audit records were removed. The changed Bank CSP row was restored from its snapshot. All **15 protected tables** matched the pre-QA snapshot byte-for-byte afterward, including users, audit/media, catalogue/settings and all three lead tables. No real/non-QA records were removed. Post-cleanup HTTP regression passed.

Removed temporary QA credentials, baseline/reference JSON, setup/cleanup fixture, generated Vite files, TypeScript build info and PHPUnit result cache. Cleared application cache and compiled views. Dependencies and the project's existing ignored operational environments/local PHP/Composer/MySQL runtime were preserved. No uploads/download fixtures or disposable verification scripts are committed. All intended disposable files were removed.

## Limitations and deferred work

Indian ten-digit mobile numbers are supported, with optional +91 normalization. Locations are self-reported. Follow-up is manual: no reminders, assignments, appointment dates, messaging, exports or invented financial reporting. All allowed statuses can be changed manually; notes/history are append-only and currently unpaginated. Existing public/admin catalogue list caps remain. File-cache locks/throttles target a single-host deployment; distributed deployments need shared atomic cache. Shared-IP limits should be tuned with real traffic. No automated retention/deletion UI is introduced: operators must define lawful retention and handle correction/removal through a private procedure. Private database/backups, HTTPS, production cookie/Hostinger setup, performance and broader accessibility/SEO review remain deployment work. Existing Phase 2 account/MFA/logo limitations remain.

No mandatory paid infrastructure, CAPTCHA, Gemini, chatbot, AI or Phase 4 work was added.

## Final commit scope

The intended local Phase 3 commit contains **29 files**: 7 new backend source/migration/test files, 4 changed backend files, 4 new frontend component/test files, 5 changed frontend files, README, 5 documentation files including this report, and 3 acceptance JPEGs. Historical Phase 1/2 reports and dependency lockfiles remain unchanged. The local commit hash and clean-tree result are recorded in the final response.

**PHASE 3 READY FOR REVIEW: YES**
