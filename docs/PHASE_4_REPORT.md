# Phase 4 — Gemini customer assistant

Validated locally on 6 October 2026. Branch `codex/phase-4` was created directly from approved Phase 3 commit `0c98a37c5c8ab5273719617fad735ae95802f428` after confirming a clean tree. Phases 1–3 remain covered by full regression. No other project/database was used; no push, merge, deployment or Phase 5 work was performed.

## Public assistant and architecture

The responsive floating React assistant is available throughout the public site, with accessible open/close controls, Escape handling, labelled bounded question input, live reply log, loading/validation/rate-limit feedback, clear-chat control and source/enquiry links. It is excluded from the admin application. Questions/answers are kept only in component memory: five visible turns and at most three previous user questions sent to Laravel. No chat transcript or provider secret is stored in localStorage or as database content. Refresh/admin navigation removes the conversation. The visitor notice explains Gemini processing and asks visitors not to share personal contacts, documents, bank details or passwords.

Flow: React → GET `/api/chat/session` CSRF bootstrap → POST `/api/chat` → deterministic public CMS retrieval → Laravel HTTP client → Gemini structured fact selection → validated CMS references → escaped fact cards and controlled Phase 3 handoff.

Gemini selects up to twelve fact identifiers and a missing-information flag. Laravel accepts only that schema, validates every identifier against the retrieved facts, and renders the original CMS text with a fixed introduction. **Generated factual prose is never displayed.** This extractive approach intentionally favors traceable stored information over unconstrained conversational wording. Model-created amounts, guarantees, partnerships, document lists and timing claims cannot become response text. Missing information directs visitors to enquiry/contact.

## Retrieval and CMS boundaries

`ChatRetrieval` uses the existing `Service::published()` scope, active categories/providers/FAQs and fixed MySQL tables/columns. It deterministically scores service titles/slugs, token matches and associated active provider names/codes; it resolves at most three services. A valid public page slug or previous bounded user question can resolve short follow-ups. Assistant history is ignored for retrieval and no history is forwarded to Gemini.

Context can include public service summaries/details/sections, document/eligibility/process/term items, active verified service fees, active service/global FAQs, associated active provider information and allowlisted public company/contact settings. Existing `amount_paise` storage/contracts remain unchanged; verified fee 12345 paise is rendered as `INR 123.45`. Provider free-text fee/processing fields are quoted only as configured public information, never inferred or expanded. Provider names alone establish no authorization. Administrative users, enquiries, notes, audit entries, sessions, credentials and private settings are never queried for context.

Limits: 100 candidate services, three selected services, sixty facts, 16,000 total fact-text characters, 1,800 characters per fact, twelve returned facts. Fixed query/table names and bound conditions prevent model or visitor SQL execution. Stable sort order/ID tie-breaks keep retrieval deterministic. No embedding/vector DB, Redis, Python service, separate AI server, external web search or new dependency was added.

## Gemini configuration and transport

Private Laravel environment/config only:

| Variable | Behavior |
| --- | --- |
| `GEMINI_ENABLED` | Defaults false; enables the provider explicitly |
| `GEMINI_API_KEY` | Private server key; absent/blank gives fallback |
| `GEMINI_MODEL` | Default `gemini-2.5-flash-lite`, including empty setting; validated bounded Gemini model name |
| `GEMINI_TIMEOUT` | Default 12 seconds; clamped to 3–20 |

The existing Laravel HTTP client calls fixed HTTPS `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Authentication uses `x-goog-api-key`, never a URL query parameter. The key is not placed in the prompt, database, logs, frontend, response or committed configuration. Context facts containing the configured key are omitted. There are no tools, SQL calls, function calls, file access or admin API credentials in the provider request. Connection timeout is three seconds, temperature zero, output budget 500 tokens, structured JSON configuration and no automatic retries. The React request aborts after 25 seconds and retains an appropriate enquiry fallback.

Implementation references: [Google generateContent API](https://ai.google.dev/api/generate-content), [structured output for generateContent](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). The chosen default has a documented free-tier option; actual project/model availability and quotas must be verified by the operator. No fixed provider quota or guaranteed free allowance is hard-coded. Configuration remains adjustable as Google changes models/API support.

## Security, grounding and failure behavior

Public POST input requires a question of 3–500 characters, optional history of at most six messages with only role/content keys, role user/assistant and content at most 500 characters each, plus an optional bounded slug. Unknown fields, system roles, extra message keys, malformed slugs and oversized input are rejected. Web CSRF applies. Limits are eight requests/minute and forty/hour per IP, plus six/minute per session, with independent rate-limit keys. Bootstrap has its own 30/minute limit. IP/session identifiers are used for throttling, not stored with transcripts.

The instruction separates untrusted question/CMS data from rules, limits the provider to supplied fact IDs and forbids outside knowledge, prompt/secret disclosure, unsupported claims, tools and writes. Common injection/private-data requests are rejected locally. The stronger output boundary does not depend on detecting every injection phrase: unknown IDs, extra prose, malformed/empty schemas, wrong types, blocked/truncated candidates and provider errors cannot render generated facts. Missing document/eligibility/fee/process kinds and sensitive claims get conservative confirmation guidance even when the model flag is false. CMS text and visitor question text are escaped by React; URLs are restricted to known relative source/handoff routes.

Disabled/missing configuration, quota errors, authentication errors, timeout/network errors, 5xx responses and invalid model output produce a generic enquiry/contact fallback, without provider diagnostics, keys or exception details. The site and existing enquiry workflow remain usable. The assistant has no business-data write methods, arbitrary SQL executor, public conversation lookup or administrative access. Normal Laravel CSRF/session infrastructure can maintain a session; this does not persist chat content.

## Lead handoff

The server constructs an enquiry URL independently of Gemini. Exactly one relevant published service produces `/services/{slug}#enquiry`; otherwise `/#enquiry` opens the homepage's existing selector form. The public widget closes on handoff. The service form is preselected/read-only where known. Existing Phase 3 validation, consent, CSRF, duplicate/spam checks and persistence remain the sole trusted lead-creation path. No automatic enquiry request is made by chat. A network fallback also uses the known page service when available.

## Exact final validation

| Check | Result |
| --- | --- |
| Laravel full Phase 1–4 regression | **79 tests / 667 assertions**, passed; includes eighteen new chat tests |
| React full Phase 1–4 regression | **57 tests / 5 files**, passed; includes eleven new chat tests |
| Live HTTP/security | **188 checks**, passed: 114 public regression/privacy/CSRF, 27 mocked-provider behavior, 18 validation, 8 session-limit, 9 independent IP-limit, 12 restored-server checks |
| TypeScript / lint / production build | `tsc -b`, Oxlint and Vite passed; 32 modules transformed |
| PHP/Pint | **61 PHP files** passed syntax; Pint `--dirty --format=agent` passed |
| Composer | Strict validation, platform checks and audit passed; no vulnerability advisories |
| npm | Audit passed; **0 vulnerabilities** |
| Schema | No new/changed migration; six existing migrations Ran; schema remains 23 tables. Full regression uses guarded isolated test-database migration setup |
| Secret scan / whitespace | Final existing scanner and staged `git diff --check` passed; final scanner covers **134 Git candidate files** |

Laravel tests mock Gemini and prevent stray requests. Coverage includes CMS document/FAQ/contact/provider/discovery/eligibility/process/verified-fee facts, missing/unknown information, unpublished/inactive exclusion, key non-exposure, CMS/visitor injection, generated-prose/unknown-ID rejection, malformed/blocked/truncated output, validation/history, session/IP/hour limits, CSRF, missing/disabled configuration, quota/auth/server/connection failures and bounded timeout. Each changing provider failure mock uses a fresh HTTP factory so all cases are actually exercised. Private users/leads/history are excluded and chat cannot create leads or audit writes.

React covers API question/history/CSRF shape, safe output/URL handling, service/general handoff, no lead creation, disabled/network fallback, rate/validation feedback, bounded history/clearing, busy-submit prevention, Escape, and simulated client timeout with preserved service handoff. All inherited tests remain; the earlier future-chat-absent assertion was updated to require validation on the now-approved route rather than weakened.

HTTP checks exercise the real Laravel middleware/retrieval pipeline. During the provider behavior group, an ignored temporary local router used `Http::fake`; those checks are explicitly mocked integration, not live Gemini calls. Real CSRF rejection, cookie flags, malformed histories, private-admin denial and separate IP/session throttles were verified. All 32 public service details and existing site/category/FAQ data passed regression. The normal server was restored and disabled-mode checks passed afterward.

## Browser acceptance and live-provider limitation

Desktop **1280 × 900**: open assistant on Bank CSP, ask about documents with no configured provider, receive safe fallback and follow Bank CSP's preselected enquiry CTA. With the temporary server-side mock, ask about Retailer ID documents, inspect original checklist/source cards and follow the controlled Retailer ID form. The mock cannot call an external provider.

Mobile **390 × 844**: grounded Retailer ID cards were readable and scrollable; quota and connection-timeout simulations showed fallback; prompt-injection/private-prompt request was denied without privileged data. Service handoff preserved Retailer ID. General callback CTA opened the homepage enquiry selector. Document width measured 375px within the 390px viewport; after correcting scrollbar-related clipping, chat panel left/right measured approximately 12.8px/363.2px. Form introductory contrast was also corrected. Admin login had no public chat widget. Captured browser error/warning logs were empty. Temporary viewport override was reset.

Safe acceptance JPEGs: `docs/previews/phase4-chat-desktop.jpg` (actual unconfigured fallback), `phase4-chat-grounded-desktop.jpg` and `phase4-chat-mobile.jpg` (explicitly mocked provider selection of real public CMS records). These contain no keys or sign-in credentials.

**Live Gemini verification: BLOCKED — no Gemini test key is configured/available in this project's environment. No live/paid Gemini call was made, and provider compatibility, account quota and real model selection quality are not claimed as verified.** This is a recorded external verification limitation; mocked implementation/regression and local browser acceptance passed.

## Cleanup and remaining limitations

Only this project's MySQL instance on port 3312 was used: development `globallink_phase1` and tests `globallink_phase1_test`. The snapshot helper checked database/port/datadir. Before and after acceptance, all **15 protected tables** matched byte-for-byte: catalogue/settings, users/audits/media and all lead tables. No QA lead/account was created, no real record was removed and no CMS content was modified. The mock router, fake configuration, snapshot helper/data, generated Vite assets, TypeScript build info and PHPUnit cache were removed. The ordinary local server was restored; application cache and compiled views cleared. Existing private operational environment/runtime/dependencies were preserved. No temporary credentials, fixture or generated build is committed.

Retrieval is bounded lexical matching with English topic heuristics, not exhaustive semantic search or guaranteed multilingual support. Large CMS entries/context are capped; returned facts can be incomplete. History is browser-only and questions have no persistent support ticket. Gemini selection quality and real API behavior need a key-enabled verification before activation. CMS wording is the factual source: administrators must maintain accuracy and verify business/partnership/fee claims. Responses conservatively request confirmation for sensitive claims. The configured default uses the generateContent structured-output interface; changing models/API versions needs provider verification. Single-host file-cache limits and shared-IP thresholds require real-traffic tuning. No global account-spend controller is added; operators must control provider billing/quotas. Review Google data-use terms before enabling, especially free-tier handling. Production Hostinger outbound HTTPS, execution limits, cookies/proxies, performance and broader accessibility review remain pending. Existing Phase 1–3 limitations still apply. No mandatory paid infrastructure or Phase 5 work was introduced.

## Intended local commit

**23 files**: twelve changed existing files; five new backend controller/request/retrieval/provider/test files; two new React widget/test files; this report; three acceptance JPEGs. Dependency lockfiles, CMS migrations and historical phase reports remain unchanged. Commit hash and clean-tree confirmation are provided in the final response.

**PHASE 4 READY FOR REVIEW: YES**
