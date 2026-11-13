# Deploy the redesign on Hostinger

Confirm in hPanel that the domain serves the existing Laravel application and identify its active document root. Automated inspection received an HTTP 403 browser challenge. For an initial Laravel cutover, follow the full [Hostinger procedure](HOSTINGER_DEPLOYMENT.md), including account compatibility, private directory layout and recovery verification.

For an existing compatible Laravel deployment:

1. Back up the active release, private configuration and CMS media. Record the active Vite manifest and its matching assets as a pair. Verify PHP 8.4, PDO MySQL and GD in hPanel.
2. Build in PowerShell from the repository root.

   ```powershell
   Push-Location frontend
   npm ci
   npm run build
   Pop-Location
   ```

3. Upload the complete contents of `frontend/dist/assets` into the active web root's `assets` directory. This is either `globallink/backend/public/assets` or `public_html/assets`, depending on the existing layout. Keep previous hashed files available during cutover.
4. Upload `frontend/dist/.vite/manifest.json` to a temporary sibling in the **private** `globallink/frontend/dist/.vite` directory. After confirming all referenced assets exist, switch it into place as `manifest.json`. Keep Laravel's existing public entry and routing files. Laravel renders the HTML.
5. Verify the existing private environment keys `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY`, database settings and, where used, Gemini settings. Keep existing values private. The redesign introduces no schema or environment change. If the target predates the checked-in provider description migration, reconcile that existing application release separately before applying this frontend.
6. Keep immutable cache rules for hashed assets. If a CDN caches HTML, purge the affected public pages at cutover. No Laravel cache rebuild is needed for a frontend-only manifest swap.
7. Smoke-test HTTPS, homepage and catalogue, all published routes, WebP loads, canonical metadata and sitemap, mobile menu and enquiry CTA. Verify the enquiry reference with a designated QA enquiry if authorized, then check admin and assistant handoff. Follow the [rollback guide](ROLLBACK_GUIDE.md) if the release fails.

This frontend requires no long-running Node process on Hostinger.
