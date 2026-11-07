# Launch checklist

What is already in place, and what a person must still do before going live. Nothing here is deployed automatically.

## Built in (verified by the automated tests)

- **Roles:** Super Admin and Staff Viewer, enforced on the server. Staff are denied by default outside their read-only allowlist and cannot export, edit, or see internal notes.
- **Sign-in:** argon2id passwords, rotating sessions, revoked on password, role or status changes, rate-limited logins, optional TOTP MFA with recovery codes (needs `MFA_ENCRYPTION_KEY`), audit log of important admin actions.
- **Requests:** CSRF protection (origin and `X-Requested-With` checks), strict CORS to `FRONTEND_URL`, request size limits, honeypot and rate limits on bookings and enquiries, duplicate-retry protection.
- **Data handling:** parameterised SQL only; customer data is never in public responses; upload type, size and file signature are checked and object names are generated.
- **Headers:** CSP, frame denial, MIME protection, HSTS on HTTPS, no-store on private responses. The CSP allows inline scripts/styles needed by the current Next.js setup; it is not nonce-based.
- **Privacy:** cookie banner with equal-prominence accept and reject, 180-day renewal, footer settings link, no analytics or marketing trackers. External media loads only with functional consent.
- **Search:** metadata, canonical URLs, sitemap, robots, LocalBusiness/FAQ/breadcrumb structured data. Search crawlers are allowed once indexing is enabled; named model-training crawlers stay blocked. Staging and local stay `noindex`.

## Before launch (manual)

1. **Environment** (Hostinger variables, never in git): `FRONTEND_URL` (https), `COOKIE_SECURE=true`, `DB_*`, `NEXT_PUBLIC_SITE_URL` set **at build time**, `MFA_ENCRYPTION_KEY`, optional `S3_*` and `MEDIA_PUBLIC_URL`. Names are in `backend/.env.example`.
2. **Indexing:** set `SEARCH_INDEXING_ENABLED=true` for the production build only, redeploy, then submit `/sitemap.xml`. Add Search Console / Bing verification values if you use them.
3. **Database:** run `npm run db:check` against production (read-only). Take a backup first. Restrict remote MySQL access to the app, and use least-privilege runtime credentials.
4. **Credentials:** rotate any credentials that were shared in chat or tickets. Create or confirm the Super Admin account, enable MFA, back up `MFA_ENCRYPTION_KEY` separately from the database, and create Staff Viewer accounts as needed.
5. **Staging rehearsal:** copy the live database to a staging database, point a staging deployment at it, and make one test booking, one enquiry and one CMS edit. Confirm Staff Viewer access.
6. **Hosting:** HTTPS, `TRUST_PROXY` set to the proxy addresses only if the host requires it, request limits at the edge, backups and restore rehearsal, log retention, monitoring. The in-process rate limiter is per process.
7. **Content approvals:** see [client-approval.md](client-approval.md): contact details, legal/policy text, prices (if any), founder and team material, testimonials, logos, photographs and videos.
8. **Media storage:** configure S3-compatible storage before using uploads; until then use external HTTPS media links in the CMS.
9. **After launch:** measure real Core Web Vitals, and check that the host's plan permits a commercial website.

## Known limits

- Booking requests do not reserve capacity; the weekly availability and blocked dates are enforced when configured.
- Homepage section order and visibility is editable; the wording of most homepage headings is still in code.
- No payments, customer accounts or email automation are included by design.
