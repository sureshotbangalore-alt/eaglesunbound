> Current site: 12 main public pages. Activity and programme details are merged into their catalogues; Gallery is retired. See `docs/page-consolidation.md` and `docs/lightweight-hosting.md` for the current structure and hosting requirements. Historical verification notes below may describe earlier revisions.

# Eagles Unbound — by YOA Labs

A local full-stack website implementation with Next.js 16, React 19, TypeScript, Tailwind 4, Motion, FastAPI, SQLAlchemy and Alembic. PostgreSQL is the deployment database; SQLite is an explicit local development alternative. The official supplied logo is preserved unchanged.

## Quick start on Windows

Prerequisites: Node.js 22.20.0, npm 11.6.2, Python 3.12.10 (exact locked versions). Run from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
python scripts/setup-local.py
cd frontend
npm ci
cd ../backend
..\.venv\Scripts\python -m alembic upgrade head
..\.venv\Scripts\python -m app.seed
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`. Use `/admin/login` for administration. The local setup script generates a unique password in the ignored `backend/.env`; read `ADMIN_EMAIL` and `ADMIN_PASSWORD` there. No shared/default password is built into the app. Seeding creates an administrator only if an email with that name does not exist; changing the seed password does not reset an existing account.

The API serves interactive documentation at `http://127.0.0.1:8000/docs`. Keep that port private in production. Next.js proxies `/api/*` to FastAPI so admin cookies remain on the website origin.

The scripts use webpack, a supported Next.js build mode, because Turbopack's CSS worker failed in this Windows environment. No custom webpack configuration is required.

## PostgreSQL and Docker

Docker was unavailable in the implementation environment, so Compose execution has not been verified here.

Copy root `.env.example` to `.env`, replace all passwords and set the site origin. For the example Compose URL, use a URL-safe database password, or supply a percent-encoded `DATABASE_URL` in a deployment-specific Compose override. Then:

```powershell
docker compose up --build
```

Compose runs PostgreSQL 17.6 (immutable image digest), applies Alembic migrations, seeds approved initial content and starts both services. Database storage is a named volume. Do not use `docker compose down -v` unless intentionally deleting the local database. To run only PostgreSQL, use `docker compose up -d db`, configure `backend/.env` from its example, then follow the native API start instructions.

## Content and admin workflows

- `/admin/pages`: homepage headings, descriptions, an HTTPS MP4/WebM hero URL, and editable story/policy pages with draft/published content. Save → refresh the public homepage. Every page read uses the database API without a stale frontend content cache.
- `/admin/programmes`, `/admin/activities`, `/admin/packages`, `/admin/clients`: draft/published records, image URL, descriptions, participant information and ordering. Slugs are validated and unique. Slug changes are deliberate: add a redirect for an existing published URL before renaming it.
- `/admin/gallery`: albums with labelled photo/video URLs and captions. Only published albums appear publicly.
- `/admin/media`: external HTTPS assets and S3 uploads, preview, deletion of unused assets. Attach assets to records using their URLs. JPEG, PNG, WebP, MP4 and WebM uploads have a 25 MB limit and content signature checks. YouTube links can be catalogued; use approved hosted MP4/WebM for background video.
- `/admin/bookings`: saved requests, search, status filter, details, internal notes and CSV export. New requests are **Pending**, not confirmed reservations. Status history is stored. There is no payment or live slot inventory.
- `/admin/enquiries`: saved enquiries, follow-up status, notes and CSV export.
- `/admin/settings`: business details, WhatsApp, social URLs and blocked dates. Unconfigured external links are hidden. Weekly availability is modelled and enforced when configured through the database; a weekly availability editor is not yet provided.
- `/admin/faqs`: factual questions, answers, ordering, publication and page assignment. A FAQ with `/programmes/<slug>` as its page appears on that programme.
- `/admin/seo`: metadata, canonical URLs, social preview and noindex overrides. The sitemap follows published database content and page noindex settings. Schema is generated from selected fields, not arbitrary injected JSON.

Three roles are enforced by the API, not just hidden in the interface:

- **Super Admin** (`admin`, YOA Labs): full access, including `/admin/users` to create accounts, change roles, enable or disable accounts and reset passwords. A Super Admin cannot disable or demote their own account.
- **Content editor** (`editor`): website content only. Cannot read customer requests, export them, edit business settings or manage users.
- **Staff viewer** (`staff_viewer`, Eagles Unbound team): signs in to `/admin/requests`, a simple read-only list of bookings and enquiries (customer contact details, programme, preferred date, participants, message, status). Staff are denied by default: the API accepts them only on `/admin/me`, `/admin/logout`, `/admin/staff/bookings` and `/admin/staff/enquiries`, and returns 403 everywhere else, including any admin route added later. Internal notes are never included.

Changing an account's role, status or password signs that account out immediately. `backend/tests/test_api.py` covers both roles, including a sweep confirming staff are refused every restricted API.

## Checks

```powershell
cd backend
..\.venv\Scripts\python -m pytest -q
..\.venv\Scripts\python -m alembic check
cd ../frontend
npm run typecheck
npm run build
```

With API and frontend servers running, run the read-only route checker from the root:

```powershell
.\.venv\Scripts\python scripts/audit-routes.py --base http://localhost:3000
```

The checker writes `docs/route-audit.json`, crawls public links and sitemap entries, verifies assets, checks H1/title/description/canonical/alt attributes, validates fragments, checks incoming navigation and expected 404 behaviour, and records redirects. It deliberately does not probe third-party services or submit forms.

Playwright and axe checks are provided in `frontend/tests/journeys.spec.ts`. Browser execution was blocked by the preview permission gate during this session, so screenshots, browser interaction, Lighthouse and measured Core Web Vitals are **not verified**. To run them in an authorised environment:

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Write journeys skip by default. Run them **only against a disposable, separately configured test database**, with `E2E_ALLOW_WRITES=true`, `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`. They create sample requests. API tests use an isolated in-memory database and do not touch the local runtime database.

## Production configuration

1. Deploy FastAPI and PostgreSQL on a Python-capable host and Next.js on a Node-capable host. This stack is not compatible with static-only hosting or a Cloudflare Workers-only backend.
2. Set `DATABASE_URL`, `ENVIRONMENT=production`, `COOKIE_SECURE=true`, `PUBLIC_ORIGIN=https://<approved-domain>`, and a unique bootstrap admin password. Production startup rejects SQLite and insecure cookies. Remove bootstrap credentials from the deployment environment after initial account creation. Revoke existing sessions when rotating administrative access.
3. Set frontend `API_INTERNAL_URL` at build time (rewrites are compiled into Next.js configuration), and at runtime (server content fetches). Set `NEXT_PUBLIC_SITE_URL` to the canonical production domain before building.
4. Terminate TLS at a trusted reverse proxy; expose only the frontend publicly. Keep the database and API on the private network. Configure body size limits, request timeouts and an edge rate limiter. The built-in limiter is process-local and uses the socket peer; proxied users can share a limit. It is an MVP safeguard, not a distributed abuse-control service.
5. Configure S3-compatible storage using the backend example environment. Serve uploads from a dedicated media origin with correct MIME headers. Access credentials stay server-side. Local uploads are not silently substituted when storage is missing.
6. Approve the content in `docs/client-approval.md`, replace illustrative images and enable `SEARCH_INDEXING_ENABLED=true` only on the approved production origin. Prelaunch pages use noindex and robots disallows crawling by default.
7. Add the canonical sitemap to Search Console after deployment. Analytics are intentionally inactive until a provider, privacy policy and consent requirements are confirmed. Add verified IDs through deployment configuration; no visitor trackers are active in this release.
8. Configure operational monitoring and notifications. Optional SMTP notifications use STARTTLS when SMTP_HOST, SMTP_FROM and NOTIFICATION_EMAIL are configured. Credentials stay server-side. Notifications include a reference and dashboard prompt, not customer contact details. Background delivery is best effort; failures do not undo a saved request. There is no durable notification queue yet, so monitor the admin dashboard and logs.

## Backups and recovery

Use managed PostgreSQL automated backups with tested restores and a client-approved retention period. For an explicit logical backup:

```powershell
docker compose exec -T db pg_dump -U eagles -d eagles -Fc -f /tmp/eagles-backup.dump
docker compose cp db:/tmp/eagles-backup.dump ./eagles-backup.dump
```

Encrypt backups, restrict access, and store them outside the host. Restore into a **new** database first using `pg_restore --no-owner`, point a staging API at it, and verify counts, records, admin login and published pages before any production cutover. Back up the object-storage bucket separately with versioning/lifecycle policies. Do not commit backups, credentials or customer exports. Set the actual retention/deletion schedule after client approval.

## Architecture

`frontend/src/app` contains server-rendered public routes and a separately authenticated admin client. `frontend/src/components` provides the design system, media, forms and editors. `backend/app` contains configuration, models, typed request schemas, authentication and API handlers; `backend/alembic` owns the versioned schema. No customer data is seeded. Initial catalogue data and public contact details are traced to the supplied brief and current business site; bootcamp details and client endorsements remain unpublished until approved.

See `docs/content-audit.md`, `docs/creative-direction.md`, `docs/client-approval.md` and `docs/verification.md` for provenance, design choices, limitations and checks.


## Motion and version stability

See `docs/motion-storyboard.md` and `docs/page-motion-review.md` for the implemented scenes and route coverage. See `docs/version-policy.md` and `runtime-lock.json` for exact dependency/runtime locks. Run `.venv/Scripts/python scripts/check-versions.py` to fail on version drift. Browser visual QA remains blocked by the saved localhost permission; motion-specific Playwright checks are included but have not been executed.


## Master brief and 3D world

The 37-page master brief comparison is in `docs/master-gap-audit.md`. The central source inventories are in `backend/app/data/`. Run the normal seed command after migrations to import additional activities, programmes, page content and draft gallery categories without overwriting existing edits. Unverified or conflicting details appear in the private Settings review panel. Three.js 0.187.0 and Anime.js 4.5.0 power the original illustrative adventure environment; it is not an accurate map or footage of the business. Exact versions remain locked.
