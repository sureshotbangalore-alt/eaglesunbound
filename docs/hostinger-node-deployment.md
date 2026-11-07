# Node.js runtime and Hostinger deployment

The site now runs as **one Node.js app**: `backend/src/server.ts` serves the API under `/api` and the Next.js site on the same port and origin.
The former Python/FastAPI backend has been removed; it remains recoverable from git history (`refs/backup/pre-cleanup-2026-11-07`).

## Settings for Hostinger Web Apps (Node.js)
| Setting | Value |
|---|---|
| Node version | 22.x (22.20.0 tested) |
| Package manager | npm (lockfile at repo root) |
| Root directory | repository root |
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm start` (listens on `0.0.0.0:$PORT`) |
| Health check | `GET /health` or `GET /api/health` |

## Environment variable names (set in Hostinger, never commit values)
See `backend/.env.example` and `.env.example`. Required in production: `PORT` (injected by Hostinger), `FRONTEND_URL` (https origin), `COOKIE_SECURE=true`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (or the existing `DATABASE_URL`), `NEXT_PUBLIC_SITE_URL` (**must be set at build time**, it is used for canonical URLs, sitemap and structured data), `MFA_ENCRYPTION_KEY` (to enrol admin MFA).
Optional: `TRUST_PROXY` (explicit proxy IPs/CIDRs only), `SESSION_HOURS`, `DB_SSL`, `DB_SSL_CA`, `S3_*` and `MEDIA_PUBLIC_URL` (media uploads).
Launch switch: `SEARCH_INDEXING_ENABLED=true` (default off: robots.txt disallows everything and pages are `noindex`).

## Database
Uses the existing MySQL database and table names. `npm run db:check` compares the schema read-only (no DDL, no data changes). `npm run db:migrate` runs the same read-only check; this release needs no schema change. `npm run db:seed` (empty database only) and `npm run db:seed -- --admin-only` replace the old Python seeding; see `docs/database-setup.md`.

## Checks
- `npm run typecheck`, `npm test` (Node API tests on an in-memory fixture database), `npm run build`.
- Browser tests (isolated fixture only, never production):
  1. `npm run build`
  2. `NODE_ENV=production npx tsx backend/tests-node/fixture-server.ts` (site + API on http://127.0.0.1:3000; add `FIXTURE_MEDIA=true` for the external-video consent test and `SEARCH_INDEXING_ENABLED=true` to test indexing)
  3. In `frontend/`: `E2E_BASE_URL=http://127.0.0.1:3000 E2E_ALLOW_WRITES=true E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=<fixture password from backend/tests-node/fixtures.json> E2E_STAFF_EMAIL=staff@example.com npx playwright test`
  The fixture server restarts with fresh data; logins are rate limited (8 per 10 minutes), so restart between full runs.

## Tools
- `node scripts/check-versions.mjs`: exact pins, lockfile and runtime consistency.
- `node scripts/security-audit.mjs`: source patterns and known advisories for locked packages.

## Motion assets
`node scripts/render-motion.mjs` re-renders the motion-graphics videos in `frontend/public/assets/video/motion/`.
