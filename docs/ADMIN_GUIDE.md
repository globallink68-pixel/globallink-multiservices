# Administrator guide — Phase 2

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

Enquiry persistence, lead management, Gemini/chatbot and deployment remain Phase 3 and later. Do not place bank account numbers, payment QR codes, submitted identity documents or secrets in public content. No external AI or paid service is required.
