# Administration — Phase 1 boundary

There is no admin interface, authentication flow, default password or CMS write API yet. /admin and public mutation routes are deliberately absent. Phase 2 must be separately approved.

Current content is stored in MySQL and initialized by CatalogueSeeder. Settings hold company name, phone, email, WhatsApp, address, logo path, social links, footer and SEO defaults; contacts are not hard-coded across React. The initial address/logo/social links are empty pending verified company assets. The supplied attachment did not contain the actual logo; a temporary native SVG GL mark is used.

During this foundation phase, an authorized maintainer can review and change catalogue records through a deliberate database maintenance session scoped to this project's database. There is no public editing workflow. Do not expose database tools or credentials through the website. The initial seeder preserves edited content, but can recreate missing starter rows; do not use it as an admin content-management action.

Phase 2 should supply protected admin accounts/roles and editing for categories, services, ordered sections/typed content, providers, provider-specific details, FAQ and site settings. Provider removal can use is_active=false; service removal can unpublish; disabling a category hides its services. Slug changes should account for future redirects.

Only verified fees should set is_verified=true. Store monetary amounts as integer paise, not floating-point rupees. Check bank authorization evidence before any partnership statement. Check eligibility, processing time and other factual claims before publication. The starter catalogue makes no guaranteed income, activation, approval or official partnership claim.

Future uploads need server-side file type/size checks, safe asset paths and authorized editing. Logo/hero/media schemas exist as foundation fields; no upload pipeline has been implemented. Enquiries/internal notes are Phase 3, chatbot settings Phase 4 and lead capture Phase 5.

Initial retailer/distributor checklists are editable database records, not actual identity documents. The public site does not receive Aadhaar/PAN images, commission-account statements, payment QR codes or bank account numbers.
