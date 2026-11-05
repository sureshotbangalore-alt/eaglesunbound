# Verification and release boundaries

## Verified in this environment

- Next.js TypeScript checks and an optimised webpack production build.
- Alembic schema generation, upgrade and drift check against the separate SQLite development database.
- 16 isolated backend tests: private API protection, origin/request checks, login/logout, editor role restrictions, persistent public CMS updates, booking references/status history, request validation/blocked dates, enquiry follow-up/export, publication controls, validated metadata/FAQs, rate limiting, unavailable storage, referenced media deletion protection, expired sessions and page-story publication. Some related behaviours share a test function.
- A real HTTP integration check through the running Next.js proxy: unauthenticated access denied; cookie login; headline saved; changed headline returned in public API and server-rendered H1; original content restored; session revoked on logout.
- Public route, admin shell, catalogue detail, sitemap, robots, local image and stylesheet checks. The machine-readable URL list and findings are in `route-audit.json`. Admin HTML is a noindex login shell; customer data is protected separately by authenticated APIs.
- The exact supplied logo is retained as the local source asset. No made-up price, rating, client endorsement or certification is seeded.

## Not verified here

- The browser permission gate denied the local preview. No browser screenshots, desktop/mobile visual review, Playwright execution, axe execution or Lighthouse measurement was performed. Their source/configuration is provided for an authorised environment. Responsive CSS and reduced-motion behaviour are implemented but need visual confirmation.
- Core Web Vitals have not been measured. The requested scores remain targets. Responsive Next Image rendering, local fonts, video posters, offscreen playback pause, lazy media and restrained animation reduce avoidable work, but they do not establish field performance.
- Docker and PostgreSQL execution: Docker was not installed. The Compose file and PostgreSQL driver/configuration are provided; the initial migration is portable SQLAlchemy/Alembic code. Run the full suite and restore rehearsal against PostgreSQL before production deployment.
- Live S3 upload/deletion and SMTP delivery require credentials and have not been exercised against a real provider. Missing storage returns an explicit configuration error. Notifications are best effort; saved requests remain in the database if delivery fails.
- Third-party social/business links were not guessed or automatically treated as broken. Unconfigured links are hidden and identified in the audit.

## Remaining work before production

Client approval and authentic media are required as listed in `client-approval.md`. Complete browser and PostgreSQL verification, production abuse controls, backup/restore rehearsal, legal review and operational monitoring before the live-domain cutover. Review all historical URLs and add the remaining redirect map.

Advanced booking slot inventory, payments and customer accounts are outside this release. Requests do not reserve capacity. The weekly availability model is enforced if configured, but a weekly-schedule editor, assigned booking time/date editor, self-service admin user management and password reset UI remain future work. There is no durable email queue or automatic privacy-retention job yet.


The master brief expansion adds the 75-record catalogue, six programmes, audience/leadership/stay/dining routes, mission selector and Three.js/Anime.js scenes. See `master-gap-audit.md` for exact publication counts and client-review items. No visual/WebGL verification is implied by successful compilation.

Latest expanded HTTP audit: 128 URLs/assets checked, zero broken, four redirects, zero warnings. The 16 API tests pass; package/runtime consistency, pip compatibility, TypeScript and production build checks pass. WebGL/browser execution and PostgreSQL/containers remain explicitly unverified.
