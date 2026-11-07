# Eagles Unbound

Website and administration portal for Eagles Unbound, an outdoor adventure and experiential learning destination in Bengaluru.

## Technology

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS and Motion.
- **Backend:** FastAPI, SQLAlchemy and Alembic.
- **Database:** PostgreSQL or MySQL/MariaDB for production; SQLite for local development.
- **Media:** S3-compatible storage for uploads, with labelled illustrative assets included for development.

Exact runtime versions are recorded in `runtime-lock.json`; frontend dependencies are pinned in `frontend/package-lock.json`.

## Project structure

```text
backend/
  app/                  API, authentication, models and catalogue data
  alembic/              Database migrations
  tests/                Backend tests
frontend/
  public/assets/        Images, fonts and licence notices
  src/app/              Public pages and administration routes
  src/components/       Shared UI, forms and content editors
  src/lib/              API helpers, metadata and imagery configuration
  tests/                Browser tests
scripts/                Local setup and verification utilities
docs/                   Content, hosting and implementation documentation
output/                 Exported project deliverables and original artwork
compose.yaml            Frontend, backend and PostgreSQL services
runtime-lock.json       Runtime and container version references
```

## Public website

The site has 13 main pages: Home, Bootcamp, Programmes, Activities, About, Founder, Stay & Dining, Contact, Book Now, Privacy, Cookies, Terms and Booking Policy.

Programme and activity details expand inside their catalogues. Audience guides are included under Programmes, and FAQs appear on Contact. Retired URLs redirect to their corresponding pages or sections. Gallery is not part of the public website.

## Local development

Requirements: Node.js **22.20.0**, npm **11.6.2** and Python **3.12.10**.

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
python scripts/setup-local.py
npm --prefix frontend ci
```

Start the backend in one terminal:

```powershell
cd backend
..\.venv\Scripts\python -m alembic upgrade head
..\.venv\Scripts\python -m app.seed
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

- Website: `http://localhost:3000`
- Administration: `http://localhost:3000/admin/login`
- API documentation: `http://127.0.0.1:8000/docs`

The setup script creates `backend/.env` with a unique local administrator password. Read the credentials there; the script preserves an existing configuration. Seeding does not reset an existing account's password. Keep environment files and credentials out of Git.

The frontend proxies `/api/*` to the backend. Its environment template is `frontend/.env.example`; backend options are in `backend/.env.example`.

## Administration

The portal manages website content, programmes, activities, media, bookings, enquiries, FAQs, SEO and business settings. Legacy catalogue modules remain available to administrators even where their standalone public pages have been retired.

| Role | Access |
| --- | --- |
| Administrator (`admin`) | Full management, including user accounts and roles |
| Content editor (`editor`) | Website content; no customer records or user management |
| Staff viewer (`staff_viewer`) | Read-only booking and enquiry views, without internal notes |

Booking submissions create pending requests, not confirmed reservations. The website does not collect online payments. Public content is cached with 60-second revalidation; updates may take approximately a minute plus background revalidation to appear.

## Verification

```powershell
cd backend
..\.venv\Scripts\python -m pytest -q
..\.venv\Scripts\python -m alembic check
cd ../frontend
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests require running frontend and backend servers and an installed Playwright browser (`npx playwright install chromium`). Tests that submit requests are disabled unless `E2E_ALLOW_WRITES=true`; use them only against a disposable test database. Authenticated admin tests require test credentials.

Read-only route audit, from the project root:

```powershell
.\.venv\Scripts\python scripts/audit-routes.py --base http://localhost:3000
```

## Deployment

For Vercel, set the project root to `frontend`. Configure `API_INTERNAL_URL` with the hosted backend address and `NEXT_PUBLIC_SITE_URL` with the final website origin. A deployed site cannot use the local backend address `127.0.0.1:8000`.

Deploy FastAPI with persistent PostgreSQL or MySQL/MariaDB and S3-compatible media storage. In production, configure `DATABASE_URL`, `PUBLIC_ORIGIN`, `ENVIRONMENT=production` and `COOKIE_SECURE=true`. Configure administrative access, backups, storage and optional SMTP notifications separately. Keep secrets server-side.

Docker configuration is provided in `compose.yaml`. Copy the root `.env.example` to `.env`, set credentials and run `docker compose up --build`. Docker execution must be verified in the target environment.

See [hosting requirements](docs/lightweight-hosting.md), [page consolidation](docs/page-consolidation.md), [content approval](docs/client-approval.md) and [media provenance](docs/media-provenance.md) for further details.

For database fields, MySQL environment configuration and schema setup, see [database setup](docs/database-setup.md).

## Latest verification and launch requirements

See [launch audit](docs/launch-audit.md) for security changes, consent behaviour, SEO verification, test results and remaining hosting/content actions. Administrator MFA is available under Users & roles once `MFA_ENCRYPTION_KEY` is configured on the backend.
