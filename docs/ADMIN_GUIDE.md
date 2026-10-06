# Administrator guide — Phases 2–3

## Create an administrator

From backend run `php artisan admin:create business-email --name="Administrator"`. The command checks email uniqueness/format, prompts invisibly for a password of at least 12 characters with mixed case and numbers, hashes it and explicitly grants the administrator flag. For controlled automation it accepts a temporary `ADMIN_PASSWORD` environment value; clear it immediately afterward. Do not put passwords in CLI arguments, commit them or capture them in screenshots/logs. No account is seeded and no public registration exists. The disposable acceptance account was removed; create your own authorized review account.

Open `/admin/login`. Laravel cookie sessions and CSRF protect the workspace; no localStorage authentication is used. Sign out when finished. Expired sessions return to login; sign in again after expiry. Production requires HTTPS. MFA, password-reset UI, account-management UI and finer editorial roles are not implemented.

## Manage content

Overview shows actual services, publication counts, categories, active providers, FAQs, recent changes and optional missing hero images. It has no financial/enquiry metrics.

Categories: add/edit name, summary, icon, order, active state and SEO. Deactivation hides the category's services publicly. Unique slugs lock after creation to preserve URLs.

Services: search/filter by category/publication; create a draft or edit existing content. General controls title/descriptions, category, icon/hero uploads, CTA text, featured status, publication and order. Publication changes require confirmation. Drafts remain editable, disappear from the public API/catalogue and show unavailable on direct public routes.

Tabs cover additional sections/processing information, benefits, eligibility, documents, features, process, fees, providers, FAQ, notes/disclaimer and SEO. Add/edit/remove/move repeatable rows; removals require confirmation. Saving updates the complex record atomically. Empty sections hide publicly. Retailer/distributor checklists remain editable, with required/optional descriptions. These are information, not uploads of Aadhaar, PAN or financial documents.

Fees use integer paise: ₹100.00 = 10000. Blank amount means contact pricing. Only active, explicitly verified fees appear publicly. Verify commercial facts before publication; no fee is seeded. Provider fees/notes are informational text, not payment processing.

Providers: add/edit code, name, description, logo, active state and order. Associate providers in a service's Providers tab, with one requirement/document per line and optional fee, processing, notes and disclaimer overrides. Blank lines are omitted on save. Inactive providers hide publicly. Labels do not establish bank partnership/authorization or guarantee commission, activation, approval or processing time.

FAQs: manage global (no selected service) or service-specific questions, active status and order. Service editor also manages its own FAQs. Inactive entries hide publicly.

Settings: company/tagline/about, phone/email/WhatsApp/address, HTTPS social links, logo/favicon/footer logo, footer/copyright and default SEO. Reload the public page to verify edits. Unknown/private settings and credentials are excluded. About summary controls the public About text, while the editorial design/copy remains in source.

## Images and audit

Upload JPEG, PNG or WebP up to 2 MB and 4 million pixels. SVG, executables, scripts, spoofed extensions and arbitrary paths are rejected. GD decodes, resizes and re-encodes as PNG, stripping metadata. UUID files are stored privately; public delivery requires a current public reference. Removing a reference does not delete the stored file automatically. General media library/pruning is deferred.

Real supplied logo was unavailable as a filesystem asset during Phase 2. The clearly marked temporary GL mark remains. Settings supports safe replacement with the approved asset. The acceptance image was a disposable color swatch, not an invented logo, and was removed.

Audit is read-only with action/entity filters and pagination. Entries contain actor, action, entity ID, fixed safe summary and timestamp, excluding submitted content, passwords, hashes, session/CSRF tokens and keys. This is lightweight history, not tamper-proof compliance storage.

## Operating boundaries

Use unpublish/deactivate for base records. There is no destructive base-record deletion API, slug rename/redirect workflow, revision history or concurrent-edit conflict handling. Service children are replaced on save; avoid simultaneous edits to the same service/FAQ. Public service lists cap at 100 and admin lists at 250. Never routinely reseed a CMS-managed installation.

The Phase 4 assistant uses only published service content, active FAQs/providers and public contact settings. Maintain clear, verified wording: provider names alone do not establish partnerships, and missing prices/timings are not inferred. Do not place bank account numbers, submitted identity documents or secrets in public CMS content. AI configuration is a private server operation, with disabled mode supported; no mandatory paid infrastructure was added. Deployment remains later work.

The assistant quotes selected published CMS facts rather than generating factual prose, and links visitors to source pages or the enquiry form. It cannot create leads, change status/notes or access this workspace. Use the same Phase 3 lead workflow after visitors submit consent-based enquiries. Browser chat is temporary, clears on refresh/admin navigation and is not saved as a lead. Google Gemini may process submitted questions when enabled; visitors are warned not to share personal/sensitive information. Review provider data-use terms and validate a real key before production activation.

## Enquiries and follow-up

Service pages identify their service automatically; homepage/contact enquiries let visitors select an available service. Name, Indian mobile, state, city/district, message and explicit contact consent are required; email is optional. Public success gives a reference without lead details. The form rejects unavailable services, mismatched/arbitrary source paths, spam honeypots, rapid attempts and duplicates. Visitors should keep the reference and contact the company for follow-up or correction/removal; there is no public lookup portal.

Open `/admin/enquiries`. Search name/reference/mobile/email/city; filter service/status and UTC date range, then Apply filters. Clear filters resets the search; records sort newest first and paginate 20. Follow-up dashboard cards open the corresponding filtered list. Detail includes necessary contact links, originating service/source and consent evidence.

Choose NEW, CONTACTED, FOLLOW_UP, QUALIFIED, CONVERTED or CLOSED and optionally add a status note. Changes retain previous/new status, administrator and server time. CLOSED can reopen to NEW; states do not imply payments or revenue. Stale edits return a conflict: reload before making a decision. Add internal notes separately; they are append-only and never public. Include only follow-up information needed by authorized administrators.

Lead reads, status changes and note additions are audited with safe summaries. All lead APIs require an administrator; logout removes access. Notes/visitor text are escaped as plain text. Automated reminders, assignments, scheduled follow-up dates, exports, retention/purge UI and deletion of individual notes are deferred. The operator must establish a retention policy and a controlled private procedure for correction/removal before production use.
