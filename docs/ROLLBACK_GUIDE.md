# Roll back the redesign

1. Locate the backed-up private Vite manifest and the matching hashed assets from the previous release.
2. Restore missing previous assets to the active document root's `assets` directory.
3. Replace the private `globallink/frontend/dist/.vite/manifest.json` with the previous copy. If HTML is CDN-cached, purge the affected public pages.
4. Verify HTTPS, catalogue and representative services, images and enquiry CTA. Verify the admin login page and assistant handoff.
5. Preserve current database records, configuration, CMS uploads and enquiry history. This release has no schema changes. For a full initial Laravel cutover, use the hosting backup and restoration procedure in [Hostinger deployment](HOSTINGER_DEPLOYMENT.md).
