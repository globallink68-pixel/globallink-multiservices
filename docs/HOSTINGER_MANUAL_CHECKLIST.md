# Hostinger manual deployment checklist

Target: https://globallinkmultiservice.in. Follow HOSTINGER_DEPLOYMENT.md for exact paths, commands and expected results. Every box below is an owner action or actual-host verification; preparation by Codex does not check it automatically.

- [ ] 1. Select the correct website/domain; verify PHP hosting, MySQL, private-folder access and a private PHP CLI execution method.
- [ ] 2. Create and verify a recoverable backup of the existing Marketing Agency site, including its domain-binding/restore procedure.
- [ ] 3. Identify and back up all relevant existing databases; keep backups private and verify recovery before overwrite.
- [ ] 4. Verify web and CLI PHP 8.4+, required extensions/GD formats, memory, upload/POST limits and writable PHP temporary directories; disable error disclosure.
- [ ] 5. Create/identify the dedicated MySQL database/user; verify actual prefixed identity, host/port, privileges and utf8mb4.
- [ ] 6. Compare ZIP SHA-256 and upload the package to a private staging location outside public_html.
- [ ] 7. Extract and place globallink/backend and sibling frontend manifest privately; production vendor is present; no Composer update.
- [ ] 8. Use the verified preferred public root or prepared fixed-public_html adapter; only public files are web accessible; old static index does not shadow Laravel.
- [ ] 9. Copy production.env.example to private .env and enter correct production values privately; no unresolved placeholders or public env files.
- [ ] 10. Generate a private APP_KEY for a new installation; preserve the existing key on redeployment.
- [ ] 11. Configure verified MySQL values without printing secrets; confirm backup and protected-data snapshot.
- [ ] 12. Inspect migration state, safely migrate --force, and verify all seven migrations Ran; no resets/wipes.
- [ ] 13. Seed only a verified empty installation, or preserve/transfer approved existing CMS/enquiry/history privately; verify 5 categories, 32 services, 52 items, 8 providers, 8 bank details, 4 FAQs and 10 settings.
- [ ] 14. Verify private CMS storage, writable storage/bootstrap cache, least-privilege permissions and no public symlink; check controlled upload/re-encoding/reference gates.
- [ ] 15. Verify real SSL, HTTP-to-HTTPS redirect, exact canonical origin/host, actual proxy detection, Secure cookies, no mixed content or loops.
- [ ] 16. Configure/test SMTP privately if available, or explicitly retain optional mail pending status; ordinary lead capture works without SMTP.
- [ ] 17. Keep Gemini disabled until private key/outbound access/model/quota are verified; do not expose key or make excessive calls.
- [ ] 18. Clear/build only config, route and view caches and recheck operation; no business cache flush or unnecessary worker/cron.
- [ ] 19. Verify actual Global Link homepage, five categories, CMS contacts/providers/FAQs, keyboard/focus and desktop/mobile navigation.
- [ ] 20. Verify all 32 published service API/HTML routes, correct initial metadata and draft/inactive exclusion.
- [ ] 21. Verify ordinary enquiry validation, consent and reference-only success using one pre-identified fictional record.
- [ ] 22. Create owner administrator privately only if needed; verify login/dashboard/CRM/history/notes/CMS/media/audits/logout and logged-out API denial.
- [ ] 23. Verify assistant disabled/failure handoff, review/edit/fresh confirmation, reference-only success and AI_ASSISTANT CRM source; live model tests only if available.
- [ ] 24. Verify response-source SEO/canonicals/social tags, true missing-page 404/noindex, robots and 39 baseline sitemap URLs with no private/draft entries.
- [ ] 25. Verify CSP/HSTS/nosniff/DENY/referrer/permissions, Secure/HttpOnly/Lax cookies, CSRF 419, private 401/no-store/noindex, no permissive CORS and sanitized errors.
- [ ] 25a. Verify .env/.git/log/SQL/private manifests cannot be downloaded; hashed assets load and public API ETags revalidate safely.
- [ ] 26. Back up then remove only the exact verified fictional QA IDs/dependents/UUID PNGs and diagnostics; retain owner admin and all legitimate/new visitor data.
- [ ] 26a. Compare protected data/counts safely, allowing identified legitimate arrivals; no broad DELETE or blind old-dump restore.
- [ ] 27. Create/verify final private release/database/media/environment backup and retain prior-site recovery until agreed retention ends.
- [ ] 28. Document/test rollback of root/release/domain binding and caches; DB recovery preserves post-backup enquiries; no broad migration rollback.

## Record completion privately

- [ ] Record package checksum, application commit, deployment timestamps, migration status and backup identifiers without secret values.
- [ ] Record actual production desktop/mobile, public/admin/SEO/security acceptance results and exact QA cleanup outcome.
- [ ] Mark live Gemini and SMTP PENDING if not actually verified; do not infer success from package readiness.
- [ ] Remove uploaded ZIPs from any public root; retain private backup/release copies with controlled access.
- [ ] Keep all credentials, keys, dumps and visitor details out of Git, screenshots and public reports.
