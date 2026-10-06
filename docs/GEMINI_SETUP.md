# Gemini setup — future Phase 4

Gemini is not installed or called in Phase 1. GEMINI_API_KEY and GEMINI_MODEL are blank placeholders in Laravel environment examples. No API key was requested or configured; the browser has no VITE_GEMINI variable, chat widget or chat endpoint.

When Phase 4 is approved, choose a currently available Gemini model and confirm quota/pricing through Google's official documentation. Keep the key only in backend environment configuration; never commit, log, return or embed it in the static bundle.

Planned flow: public React widget -> validated Laravel /api/chat -> published MySQL catalogue/FAQ/provider retrieval -> bounded context -> server-side Gemini HTTP call -> validated answer/fallback. Retrieval uses existing bound catalogue queries. The model never executes SQL or writes arbitrary database data. Missing fees, eligibility, processing dates, partnerships and guarantees must remain explicitly unconfirmed.

Add per-IP/session throttling, question/history/context limits, timeouts, abuse protection, operational enable/disable settings and tests for provider failure/quota exhaustion before enabling. The website must stay usable without AI. Phase 3 enquiry infrastructure should provide the later fallback; until then normal phone/email/WhatsApp contact remains available. Lead capture belongs to Phase 5 and uses a structured, consented, server-validated enquiry operation.

No mandatory paid infrastructure or quota commitment has been introduced.
