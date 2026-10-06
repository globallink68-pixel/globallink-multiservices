# Database — Phase 1

## Isolation

Development: globallink_phase1. Automated tests: globallink_phase1_test. Both live on the newly initialized MySQL 8.0 data directory tools/mysql-data, TCP 127.0.0.1:3312. Existing database services on other ports were not connected to or modified. The app user has privileges only on these two databases. APP_KEY/passwords are in ignored environment files; the local root credential is ignored under tools.

Tests enforce the database name and port before RefreshDatabase can execute. Never run migrate:fresh on a production or another project's database. The report records a rebuild/rollback/reapply on the dedicated test database only.

## Migrations and tables

Four migrations create 18 tables including the migrations ledger. Three framework migrations create users, password_reset_tokens, sessions, cache, cache_locks, jobs, job_batches and failed_jobs. No admin user is seeded.

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

Typed content items avoid seven identical child tables while retaining normalized independently editable records. Detailed processing information can use an ordered section; provider processing notes are separate. Upload validation/rendering and admin editing are Phase 2. Future enquiries/enquiry_notes, chat_sessions/chat_messages, audit_logs and media tables will be added in their respective phases; their absence is deliberate.

## Initial records

5 categories / 32 services / 8 providers / 8 CSP-provider mappings / 52 content items (32 disclaimer terms + 20 document checklist items) / 4 global FAQ / 10 public settings. No fee or invented eligibility/processing records are inserted. Category service counts are 6 banking, 7 Digital Seva, 5 business, 6 software and 8 marketing.

Catalogue: Bank CSP; Insurance POSP ID; Loan DSA ID; Credit Card DSA ID; Digital Account Opening ID; White Label ATM; AEPS; DMT; Micro ATM; Mobile Recharge; BBPS; PAN Services; IRCTC-related service; Retailer ID; Distributor ID; Travel Agency ID; Mineral Water Plant; Solar Energy System; Website Development; Mobile App Development; Billing Software; School Management System; CRM Software; E-commerce Store; Social Media Marketing; Facebook Marketing; Instagram Marketing; Google Ads; SEO; Graphic Design & Branding; Video Editing; Reels Marketing.

CSP labels: SBI, Bank of Baroda (BOB), Bank of India (BOI), Union Bank, Indian Overseas Bank (IOB), UCO Bank, NSDL and HDFC. Names are informational labels; no official authorization is claimed. Provider flags allow later removal from the public API without deleting the historical row.

Retailer and Distributor each have 10 separate document records: current location; GPS Map Camera picture; Aadhaar both-side clear copy; PAN picture; Aadhaar-linked mobile; email; cancelled cheque/bank statement for commission account; shop electricity bill; shop agreement; trade licence. These are descriptions only. No identity uploads, account numbers, QR codes or private client data are stored.

## Seeding policy

CatalogueSeeder inserts missing records using stable slugs/codes/labels and preserves existing edited content. Re-running it passes an idempotency test, but intentionally deleted starter records may be recreated. Use seed only for initial installation/test fixtures. Future CMS changes and upgrades should use migrations or deliberate admin actions, not routine reseeding. Only the first setup migration/seed is appropriate on the dedicated empty development database.
