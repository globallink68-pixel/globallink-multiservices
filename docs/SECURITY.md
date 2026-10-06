# Security boundaries — Phase 6

Production supports one HTTPS origin on one PHP host with private MySQL, encrypted database sessions and private file cache/media. Actual Hostinger configuration remains a Phase 7 gate.

## Public and administrator surface

Public reads scope to published services under active categories, active FAQ/provider rows, active verified fees and an explicit settings allowlist. Unpublished/inactive/unreferenced media is private. Public DTOs exclude users, lead records, private settings, model flags and passwords. Every API sends noindex; robots is crawl guidance, never authorization.

Login verifies administrator status, bounds credentials, throttles IP/email attempts, regenerates sessions and returns minimized user data. CMS/CRM/media-preview operations check authorization: guests are 401 and non-admin users 403. Logout invalidates session/CSRF. Mutations retain Laravel web sessions/CSRF; no state-changing GET exists. Users cannot mass-assign is_admin. Public registration and lead/history read routes are absent. Frontend redirects are restricted to internal admin paths.

Limits: login 20/minute/IP plus five attempts/minute/IP/email; catalogue 90/minute/IP; chat 8/minute/IP, 40/hour/IP, 6/minute/session; enquiry 5/minute/IP, 20/hour/IP and three successes/10 minutes/mobile across both channels; review/cancel 10/minute/IP, 40/hour/IP, 6/minute/session. Duplicate and atomic review locks remain in private file cache. Tune against observed traffic.

## Validation, output and files

Bound queries and explicit validated DTOs prevent user-selected SQL/columns and mass assignment. Slugs lock after creation. Source paths are constrained; assistant fields/source spoofing cannot control AI_ASSISTANT. Consent/publication are rechecked transactionally. Random ten-minute review tokens are session/payload-HMAC bound; cache holds hashes rather than contact data. Confirmation is separate and idempotent within the bounded replay window.

Request limits are 16 KiB public, 1 MiB admin JSON and 3 MiB multipart media transport. PHP must also enforce post_max_size and writable private temporary storage. Existing field/nested-array bounds remain. Forms focus associated error summaries and synchronously guard submission.

CMS strings/metadata are escaped React/Blade text. No rich HTML execution is introduced. Uploads verify actual MIME/extension, 2 MB/4-million-pixel bounds and GD decode; PNG re-encoding removes metadata/executable content. Delivery requires exact cms/UUID.png path, image/png MIME and current publication/authorization. UUIDs never select arbitrary filesystem paths. SVG/executables/path substitution are rejected; no public private-storage symlink is used.

## Transport, headers and diagnostics

Production fails closed for HTTP/debug/non-HTTPS APP_URL/unexpected host. Only verified proxy IPs/CIDRs can supply client IP/protocol/port; wildcard trust and forwarded Host are excluded. Cookies are Secure/HttpOnly, host-only by default, SameSite=Lax; production encryption is enforced. CORS grants no external origins/credentials.

Success and Laravel errors use nosniff, DENY, strict-origin-when-cross-origin, restricted Permissions-Policy and CSP with same-origin script/style/connect/font/images, data images, no objects/framing/base URI and same-origin form actions. Media preserves its stricter sandbox. Secure production responses receive HSTS. Private/session/lead/error responses are no-store; public catalogue ETags revalidate current scoped JSON every time, preventing stale publication disclosure.

Production server failures return generic JSON. Exception logs retain only class, excluding messages, SQL bindings, stacks and request payloads. Sensitive input fields are not flashed. Audit summaries contain fixed action/entity wording, actor, ID and time, without contact/message/token values. PHP startup errors precede Laravel; `.user.ini`/hPanel display settings and protected PHP logs are mandatory. Apache/LiteSpeed static/error headers and private-path rules require host verification.

## Gemini and remaining operator duties

Keys exist only in private Laravel environment/config/provider headers. Gemini receives bounded published facts/questions, never structured contact fields, users/leads/notes/admin data. Outputs select known fact IDs; no tools/SQL/mutation paths exist. Provider failures cannot bypass consent/review/confirmation or block the ordinary form. Live provider verification remains blocked without a key.

Operators control verified CMS content/SEO uniqueness, access, backups, contact retention/correction/removal, logs, proxy identity, TLS, permissions, mail/privacy review and real traffic tuning. Single-host locks, lexical English matching, bounded replay, list caps and broader assistive-technology/browser coverage remain limitations. Local QA implies no production penetration test, formal accessibility certification, host verification or live Gemini success.
