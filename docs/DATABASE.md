# Database — Phases 1–5

## Isolation

Development: globallink_phase1. Automated tests: globallink_phase1_test. Both live on the newly initialized MySQL 8.0 data directory tools/mysql-data, TCP 127.0.0.1:3312. Existing database services on other ports were not connected to or modified. The app user has privileges only on these two databases. APP_KEY/passwords are in ignored environment files; the local root credential is ignored under tools.

Tests enforce the database name and port before RefreshDatabase can execute. Never run migrate:fresh on a production or another project's database. The report records a rebuild/rollback/reapply on the dedicated test database only.

## Migrations and tables

Seven migrations retain 23 tables including the migrations ledger. Three framework migrations create users, password_reset_tokens, sessions, cache, cache_locks, jobs, job_batches and failed_jobs. No admin user is seeded.

The catalogue migration creates nine domain tables:

| Table | Responsibility / integrity |
| --- | --- |
| categories | Unique slug; display order and active state |
| services | Category FK with restricted deletion; unique slug; publication/featured flags, text, icon, hero path, SEO fields |
| service_sections | Ordered free-text section titles/body; service FK cascade |
| service_content_items | Ordered typed benefit, eligibility, document, feature, process, note or term; service FK cascade; unique service/kind/label |
| service_fees | Nullable unsigned integer amount_paise, INR currency, notes, explicit verification; service FK cascade |
| providers | Unique provider code; label, optional logo/description, active state/order |
| bank_service_details | Unique service/provider pair; both FKs cascade; JSON eligibility/document overrides and optional fee/processing notes |
| faqs | Global or service FAQ; service FK cascade; active/order index |
| site_settings | Unique key, text value and public flag; API additionally enforces a fixed safe-key allowlist |

Typed items avoid seven identical child tables while retaining independently editable records. Detailed processing information uses ordered sections; provider processing notes are separate. Chat sessions/messages remain deferred.

Phase 3 migration `2026_10_06_132218_create_enquiry_management_tables` adds:

| Table | Responsibility / integrity |
| --- | --- |
| enquiries | Unique GL reference, restricted service FK, bounded contact/location fields, message/source path, consent time/version, current status, duplicate HMAC, timestamps; status/date and service/date indexes |
| enquiry_status_history | Cascading enquiry FK; previous/current status, nullable administrator FK, optional note, server timestamp; enquiry/id index |
| enquiry_notes | Cascading enquiry FK; nullable administrator FK, plain-text body, server timestamp; enquiry/id index |

Service deletion is restricted while leads reference it. Unpublication does not remove historical leads. Deleted administrator FKs become null, retaining history/note text and time. New enquiries create the initial NEW history row atomically; row locks protect subsequent status/history writes. Fingerprints contain keyed hashes, not raw IP/browser data. Contact information is stored only as needed for follow-up and excluded from public DTOs/audits. No retention/deletion UI or automatic purge is introduced. Guarded test-only rebuild/seed and Phase 3 rollback/reapply passed with all six migrations.

Phase 2 migration `2026_10_06_082727_extend_catalogue_for_admin_cms` adds default-false users.is_admin, category SEO, service icon_path/cta_text, content-item is_required, fee is_active and provider-detail notes/disclaimer. It creates audit_logs (nullable administrator FK, fixed summary, entity/time index) and media_assets (unique UUID/path, MIME/size, administrator FK). Administrator FKs become null if the user is removed. No catalogue row is deleted by migration. down() removes only Phase 2 additions. Fresh+seed and Phase 2 rollback/reapply were verified solely on the guarded test database.

Complex service updates atomically replace that service's ordered children and provider associations. Base records use unpublish/deactivate; no destructive category/service/provider API exists. Slugs lock after creation. Uploaded references must match media_assets UUIDs; arbitrary paths/URLs are rejected. Audit records are read-only through the application.

## Initial records

5 categories / 32 services / 8 providers / 8 CSP-provider mappings / 52 content items (32 disclaimer terms + 20 document checklist items) / 4 global FAQ / 10 public settings. No fee or invented eligibility/processing records are inserted. Category service counts are 6 banking, 7 Digital Seva, 5 business, 6 software and 8 marketing.

Catalogue: Bank CSP; Insurance POSP ID; Loan DSA ID; Credit Card DSA ID; Digital Account Opening ID; White Label ATM; AEPS; DMT; Micro ATM; Mobile Recharge; BBPS; PAN Services; IRCTC-related service; Retailer ID; Distributor ID; Travel Agency ID; Mineral Water Plant; Solar Energy System; Website Development; Mobile App Development; Billing Software; School Management System; CRM Software; E-commerce Store; Social Media Marketing; Facebook Marketing; Instagram Marketing; Google Ads; SEO; Graphic Design & Branding; Video Editing; Reels Marketing.

CSP labels: SBI, Bank of Baroda (BOB), Bank of India (BOI), Union Bank, Indian Overseas Bank (IOB), UCO Bank, NSDL and HDFC. Names are informational labels; no official authorization is claimed. Provider flags allow later removal from the public API without deleting the historical row.

Retailer and Distributor each have 10 separate document records: current location; GPS Map Camera picture; Aadhaar both-side clear copy; PAN picture; Aadhaar-linked mobile; email; cancelled cheque/bank statement for commission account; shop electricity bill; shop agreement; trade licence. These are descriptions only. No identity uploads, account numbers, QR codes or private client data are stored.

## Seeding policy

CatalogueSeeder inserts missing records using stable slugs/codes/labels and preserves existing edited content. Re-running it passes an idempotency test, but intentionally deleted starter records may be recreated. Use seed only for initial installation/test fixtures. Future CMS changes and upgrades should use migrations or deliberate admin actions, not routine reseeding. Only the first setup migration/seed is appropriate on the dedicated empty development database.


## Phase 5 source migration

`2026_10_06_144624_add_lead_source_to_enquiries_table` adds indexed VARCHAR(20) lead_source, default WEBSITE_FORM. Server writes allow only WEBSITE_FORM or AI_ASSISTANT. Existing enquiry/history/note schema and foreign keys remain intact; there are no chat/prompt/review tables. Review state contains hashes only in short-lived private cache. Guarded test-only rebuild, rollback of this column and reapply passed; a legacy enquiry retained its data and received WEBSITE_FORM. Development received only the incremental migration.
