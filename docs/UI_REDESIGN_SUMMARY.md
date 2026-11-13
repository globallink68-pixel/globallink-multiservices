# Public website redesign

The homepage pairs a navy hero and original commercial-district artwork with service and contact actions. Four illustrated groups lead into the five CMS categories. The catalogue retains API-backed filtering and search and presents image-led cards. Website Development is the reference detail page. All 32 published routes use the same visual layout, with service-specific enquiry guidance and related services drawn from the published category.

React, Vite, React Router, Laravel, MySQL, Playwright MCP, ImageGen, Pillow, Git and PowerShell were used. The implementation uses local images and CSS motion, including reduced-motion support. Public URLs, CMS authority, existing enquiry submission, admin and assistant integrations use the existing application paths. The redesign adds no dependency or migration.

Primary code changes are in `frontend/src/App.tsx`, `components.tsx`, `style.css`, `service-content.json`, `artwork/` and `Artwork.test.tsx`. See the test results and the deployment and rollback guides in this directory.
