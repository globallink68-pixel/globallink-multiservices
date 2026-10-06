# Architecture — Phase 1

## Boundaries

A completely new repository and isolated database under this project root. React 19 + TypeScript + Vite render the marketing site. Laravel 13/PHP 8.4 exposes read-only JSON from MySQL. Development uses localhost:5175 and localhost:8012 with a Vite API proxy; production should use a single HTTPS origin with static frontend assets and a PHP-backed /api path.

No Node/Python server, Redis, paid CMS, cloud platform, vector store or third-party runtime service is required. Composer and Node are install/build tools. Boost/Pint/PHPUnit and browser test libraries are development tooling. Framework job/cache tables are scaffold infrastructure, not an implemented background-worker requirement; runtime uses synchronous queue and file cache.

## Request flow

Browser -> React router -> /api/site or /api/services -> Laravel controller -> scoped Eloquent/bound queries -> MySQL -> explicit resource DTO -> escaped React text.

- GET /api/site: allowlisted public settings, active categories, active global FAQ.
- GET /api/services: published services under active categories, optional validated category slug, stable ordering; maximum 100 records.
- GET /api/services/{slug}: the same publication scope plus ordered sections/content, verified fees, active provider details and active service FAQ.

Unknown query parameters are rejected on the catalogue list. Slugs never become SQL or file paths. Public reads are limited to 90 requests/minute per IP. Internal flags, timestamps, users and arbitrary settings are excluded. Service identifiers are public catalogue identifiers, not credentials.

## Frontend

One dynamic detail component supports every service. Homepage featured cards, category navigation, services, FAQ, public contacts and checklists come from the API. Editorial marketing copy and native SVG/CSS artwork belong to the design system. Empty optional detail groups disappear. Prices use integer paise from the API and INR display formatting; no prices are seeded. Async requests are aborted and stale responses ignored on route changes. Loading, error, retry and empty states are visible.

Semantic sections/headings, focus indicators, skip link, native FAQ disclosure, responsive navigation, readable cards and reduced-motion CSS form the initial accessibility foundation. No third-party web font or image download is needed. Service titles/meta descriptions are set on navigation. Full SEO and accessibility/performance audits remain Phase 6.

## Security and publication

No write, login, admin, upload, enquiry or chat endpoint exists in Phase 1. CMS text is rendered as text; rich HTML is not executed. Money requires a verified fee flag before public API exposure. Provider names are editable labels and carry a no-partnership disclaimer. Document checklist descriptions contain no submitted identity documents or payment instructions. API secrets are never returned, including settings incorrectly marked public but absent from the allowlist.

Production requests fail closed if APP_DEBUG is enabled or HTTPS is absent. Configure a trusted TLS proxy deliberately if hosting requires it; do not blindly trust arbitrary forwarded headers. Response headers include nosniff, DENY framing and a conservative referrer policy. Public JSON is no-store. File cache throttling suits one PHP host; multi-host operation is outside this scope.

## Subsequent phases — not implemented

2: protected admin CMS, authorization, media validation, field validation, safe text/asset editing and audit decisions.
3: consent-based enquiry forms, validated persistence, statuses, internal notes and spam protection.
4: Laravel-only Gemini integration with database-grounded context, budget/rate/history limits, timeout and fallback; no model access to arbitrary SQL.
5: structured lead capture through normal validated enquiry services.
6: comprehensive security, SEO, accessibility and performance QA.
7: verified Hostinger deployment package, migration/backup/restore procedure and HTTPS acceptance.

No future phase has been started. Schema extensions should be incremental migrations; do not duplicate catalogue content in frontend or AI prompts.
