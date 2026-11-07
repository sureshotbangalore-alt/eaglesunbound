# Eagles Unbound

Website and administration portal for Eagles Unbound, an outdoor adventure and experiential learning destination in Bengaluru.

## Technology

- **Runtime:** one Node.js application. Express serves the API under `/api` and the Next.js site on the same port and origin (`backend/src/server.ts`).
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS and Motion.
- **Database:** the existing MySQL/MariaDB database through `mysql2`. Table names and request/response contracts are unchanged.
- **Media:** S3-compatible object storage for uploads, plus bundled images and motion-graphics videos.

Exact runtime versions are in `runtime-lock.json`. Every dependency is pinned and locked in the root `package-lock.json` (npm workspaces: `backend`, `frontend`).

## Project structure

```text
backend/
  src/                  Express API: routes, auth, validation, MFA, media, seeding
  data/                 Starter content and the master activity/programme catalogue
  schema/mysql.sql      Schema for an EMPTY database (no data, no DROP statements)
  tests-node/           API tests, in-memory fixture database and fixture server
frontend/
  public/assets/        Images, fonts, licence notices, bundled videos
  src/app/              Public pages and administration routes
  src/components/       Shared UI, forms and content editors
  src/lib/              API helpers, metadata, consent and imagery configuration
  tests/                Browser tests (Playwright)
scripts/                Version check, security audit, motion-video renderer
docs/                   Deployment, database, launch and content documentation
output/                 Exported deliverables and original artwork
runtime-lock.json       Locked Node and npm versions
```

## Public website

13 main pages: Home, Bootcamp, Programmes, Activities, About, Founder, Stay & Dining, Contact, Book Now, Privacy, Cookies, Terms and Booking Policy. Programme and activity details expand inside their catalogues, FAQs appear on Contact, and retired URLs redirect to their replacements.

## Local development

Requirements: Node.js **22.20.0** and npm **11.6.2**, plus a MySQL/MariaDB database you are free to use. Do not experiment against the live database.

```bash
npm ci
cp backend/.env.example backend/.env   # then fill in the DB_* values and FRONTEND_URL
npm run db:check                       # read-only schema compatibility check
npm run dev                            # API + site on http://localhost:3000
```

- Website: `http://localhost:3000`. Administration: `http://localhost:3000/admin/login`.
- Create the first administrator on a database that has none: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (14+ characters) in `backend/.env`, then `npm run db:seed -- --admin-only`.
- Seed starter content into an EMPTY database only: `npm run db:seed` (it refuses to run when homepage content already exists).

To try the site with no database at all, use the in-memory fixture server described in [docs/hostinger-node-deployment.md](docs/hostinger-node-deployment.md).

## Administration

The portal manages homepage text and sections (show, hide, reorder), programmes, activities, packages, clients, gallery, media, FAQs, SEO, contact settings, bookings, enquiries and users.

| Role | Access |
| --- | --- |
| Super Admin (`admin`) | Full management, including users, settings, exports and request statuses |
| Staff Viewer (`staff_viewer`) | Read-only booking and enquiry views; no internal notes, exports or any admin API |

Only these two roles can be assigned. Permissions are enforced on the server. Booking submissions create pending requests, not confirmed reservations, and there is no online payment. CMS changes appear on the public site immediately. Optional administrator MFA is available once `MFA_ENCRYPTION_KEY` is configured.

## Verification

```bash
npm run typecheck                   # backend + frontend
npm test                            # API tests on an in-memory fixture database
npm run build                       # backend (tsc) + frontend (next build)
node scripts/check-versions.mjs     # exact pins, lockfile and runtime consistency
node scripts/security-audit.mjs     # source patterns + known advisories for locked packages
```

Browser tests (consent, journeys, CMS, route audit) run against the fixture server only; see [docs/hostinger-node-deployment.md](docs/hostinger-node-deployment.md). Tests that write data are skipped unless `E2E_ALLOW_WRITES=true`; never point them at production.

## Deployment

See [docs/hostinger-node-deployment.md](docs/hostinger-node-deployment.md) (settings and environment variable names), [docs/database-setup.md](docs/database-setup.md) and [docs/launch-checklist.md](docs/launch-checklist.md) (manual steps before going live). Related: [content approval](docs/client-approval.md), [media provenance](docs/media-provenance.md), [page consolidation](docs/page-consolidation.md) and the [design note](docs/quiet-redesign.md).
