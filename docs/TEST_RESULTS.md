# Redesign test results

- Baseline frontend: 124 tests passed and the Vite production build succeeded.
- Final frontend: 126 tests passed across 11 files. The build and Oxlint passed. The two added tests cover distinct service assets, lazy loading, CMS precedence and image failure recovery.
- Laravel: 129 tests and 1,565 assertions passed with the repository PHP runtime and isolated MySQL test database. Existing suites cover enquiries, authorization, CMS, provider and assistant behavior.
- Deployment packager: 6 tests passed. The production npm audit returned zero vulnerabilities. The Git candidate secret scan and whitespace check passed.
- The local development database lacked the checked-in provider description migration and returned HTTP 500 on detail API requests. Applied that existing additive migration only to the isolated local development database. The redesign introduces no migration.
- Playwright decoded the slug-specific image on all 32 detail routes and verified HTTP status, heading, alt text and description. A rapid sweep hit the existing API request limit. The paced sweep passed.
- The homepage, catalogue, Website Development, Bank CSP, Retailer ID and SEO passed width checks at 320, 390, 768, 1024 and 1440 CSS pixels. Reduced motion was checked at 390. Keyboard navigation, search, card activation and enquiry form access passed. Eight screenshots were captured and visually reviewed.
- The Laravel Boost development logger produced inline CSP warnings on the default development server. The production-like browser server uses the same application with Boost disabled, without changing CSP. Production vendor packaging excludes Boost.

Lighthouse 13.6.0 used Chrome headless, simulated mobile throttling and the production frontend bundle served by local Laravel. Performance was below the 90 target. Local measurements do not include Hostinger and its CDN. JSON reports and browser screenshots accompany this delivery.

The live website returned an HTTP 403 browser challenge. Live Hostinger configuration and live Gemini responses were outside the local verification. Enquiry submission and authenticated admin operations were verified through automated regression suites.

| Local Lighthouse mobile | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Homepage | 78 | 100 | 100 | 100 |
| Catalogue | 79 | 100 | 100 | 100 |
| Website Development | 60 | 96 | 100 | 92 |

With Boost disabled, the browser smoke check reported zero console warnings or errors across the homepage, Website Development and admin login. The assistant region opened and the service enquiry exposed required fields plus phone, email and WhatsApp links. No live Gemini call or browser-based lead write was performed.
