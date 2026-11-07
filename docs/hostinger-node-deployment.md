# Hostinger deployment (Node.js)

The site is **one Node.js application**: `backend/src/server.ts` (compiled to `backend/dist/server.js`) serves the API under `/api` and the Next.js site on the same port and origin. No Python, FastAPI, SQLAlchemy or Alembic is involved.

## Hostinger settings

| Setting | Value |
|---|---|
| Branch | `main` |
| Node.js | 22.x |
| Root directory | repository root |
| Install | `npm install` (the root `.npmrc` makes sure dev dependencies are installed, which the build needs) |
| Build command | `npm run build` |
| Start command | `npm start` (runs `node backend/dist/server.js`; listens on `0.0.0.0` and `$PORT`) |
| Health check | `GET /health` (also `/api/health`) runs `SELECT 1` only: HTTP 200 `{"status":"ok"}`, or HTTP 503 `{"status":"unavailable","detail":"database unavailable","code":"..."}` |

`npm run build` first runs `scripts/check-env.mjs`, which stops with a plain message (naming the variable, never a value) if the Node version, build tools or public site address are wrong. It never touches the database. Neither install, build nor start runs any database command.

## Environment variables

Set these in the Hostinger panel (Environment variables). **Names and safe values:**

| Variable | Value | Notes |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | Database on the same Hostinger account. TLS is off by default for `127.0.0.1`, on for remote hosts. |
| `DB_PORT` | `3306` | |
| `DB_NAME` | your database name | from hPanel |
| `DB_USER` | your database user | from hPanel |
| `DB_PASSWORD` | your database password | **secret**: set it only in the Hostinger panel |
| `ALLOW_DB_WRITES` | `false` | **Read-only mode** (the default). Set to exactly `true` only when the site should save data. |
| `NEXT_PUBLIC_API_URL` | `/api` | where the browser calls the API |
| `API_INTERNAL_URL` | `/api` | fallback only: server rendering reads data directly in the same process (no HTTP). If that is unavailable, an absolute `https://…/api` here is used, otherwise `https://eagles.ssbsureshot.in/api` |
| `CORS_ORIGINS` | `https://eagles.ssbsureshot.in` | comma-separated https origins. Add the custom domain later, no code change. Also sets the canonical site address. |
| `TRUST_PROXY` | `1` | one Hostinger reverse proxy. Never `true`. |
| `PORT` | provided by Hostinger | do not set it yourself. The server uses it whenever it exists; if none is provided it falls back to 3000. A `PORT` that is set but not a valid port number stops the start with a clear message. |

Optional: `NEXT_PUBLIC_SITE_URL` (only if it must differ from the first `CORS_ORIGINS` entry; needed at build time), `SEARCH_INDEXING_ENABLED` (`false` until launch), `MFA_ENCRYPTION_KEY`, `S3_*` and `MEDIA_PUBLIC_URL` (uploads), `SESSION_HOURS`, `DB_SSL`, `DB_SSL_CA`. Secure cookies are on by default in production; `COOKIE_SECURE=false` is refused. The full list with placeholders is in `.env.example`.

## When /health returns 503

The `code` (and the `db_check_failed` line in the runtime log, which holds only codes, never the host, user or password) tells you what to fix. `npm run db:ping` runs the same read-only `SELECT 1` check from a terminal.

| Code | Meaning | What to check |
|---|---|---|
| `DB_CONNECTION_REFUSED` | Nothing accepted the connection at `DB_HOST:DB_PORT` | `DB_HOST`/`DB_PORT`. If the Node.js app does not run on the same server as MySQL, `127.0.0.1` will not work: use the MySQL host name shown in hPanel and allow remote access for it |
| `DB_ACCESS_DENIED` | MySQL rejected the user name, password or source host | `DB_USER`, `DB_PASSWORD` (quote it if it contains `#`), and the database user's allowed hosts |
| `DB_NOT_FOUND` | Connected, but the database name does not exist | `DB_NAME` |
| `DB_HOST_NOT_FOUND` | The host name could not be resolved | spelling of `DB_HOST` |
| `DB_TIMEOUT` | No answer within 8 seconds | firewall or remote-access setting |
| `DB_TLS_FAILED` | The TLS handshake failed | set `DB_SSL=false` for a database that does not offer TLS, or provide `DB_SSL_CA` |
| `DB_QUERY_FAILED` | Any other database error | the `error_code` in the log line |

## Read-only mode (`ALLOW_DB_WRITES=false`)

With writes off, the public pages, `/health` and every read work. Everything that would change data is refused with HTTP 503 and the message "The website is in read-only mode": booking and enquiry forms, administrator **sign-in** (it records a session), CMS saves, uploads and exports. It is enforced twice: the API rejects every non-read request up front, and the database layer refuses any statement that is not a SELECT, even if some route forgot. Nothing is changed, so the site can be inspected safely.

To go live, change `ALLOW_DB_WRITES` to `true` and restart the app. Do this only after the checks below.

## Database commands

| Command | Modifies data? | Needs |
|---|---|---|
| `npm run db:check` (also `db:migrate`, which is the same check) | **No**: reads `INFORMATION_SCHEMA` only | database variables |
| `npm run db:seed -- --confirm-database=<name>` | **Yes**: inserts starter content into an empty database; refuses if homepage content exists | `ALLOW_DB_WRITES=true` and `--confirm-database=<exact database name>` |
| `npm run db:seed -- --admin-only --confirm-database=<name>` | **Yes**: inserts one administrator | same, plus `ADMIN_EMAIL` and `ADMIN_PASSWORD` |
| `npm run db:create-user -- --email <address> --role <admin\|staff_viewer> --password-from <ENV_VAR_NAME> --confirm-database=<name>` | **Yes**: inserts one account, never changes an existing one | same |

None of these runs automatically. The schema is unchanged; see `docs/database-setup.md`.

## Behind the proxy and HTTPS

- The app listens on plain HTTP; Hostinger terminates HTTPS. `TRUST_PROXY=1` makes the app use the visitor address and protocol that the proxy forwards, so login and form rate limits apply per visitor. Without it every visitor would share the proxy's address.
- The session cookie is `HttpOnly; Secure; SameSite=Lax`. Cross-site requests are refused: only origins listed in `CORS_ORIGINS` are accepted, and admin writes also need the `X-Requested-With` header.
- Production errors return a generic message; details, stack traces and connection information are never sent or logged. Startup problems log which variable is wrong, never its value.
- Shutdown (`SIGTERM`/`SIGINT`) finishes in-flight requests, then closes the database pool.

## Checks before turning writes on

1. Deploy with `ALLOW_DB_WRITES=false`. Open the home page, a programme page, `/health` and `/sitemap.xml`; confirm the content appears and a booking attempt shows the read-only message.
2. Run `npm run db:check` (read-only) on the host; expect `"compatible": true`.
3. Copy the database to a staging database and test one booking, one enquiry, one CMS edit and Staff Viewer access there.
4. Create the administrator (see the table above), then set `ALLOW_DB_WRITES=true`, restart, and sign in.
5. Set `SEARCH_INDEXING_ENABLED=true` for the production build only when the content is approved.

## Verifying this repository

```bash
npm run typecheck
npm test                              # backend API tests on an in-memory database
npm run build
node scripts/check-versions.mjs       # exact pins, lockfile and runtime
node scripts/security-audit.mjs       # source patterns + known advisories
```

Browser tests run only against the fixture server (`backend/tests-node/fixture-server.ts`), which uses an in-memory database and refuses non-local targets:

1. `npm run build`
2. `NODE_ENV=production npx tsx backend/tests-node/fixture-server.ts` (add `FIXTURE_MEDIA=true` for the external-video consent test)
3. In `frontend/`: `E2E_BASE_URL=http://127.0.0.1:3000 E2E_ALLOW_WRITES=true E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=<fixture password from backend/tests-node/fixtures.json> E2E_STAFF_EMAIL=staff@example.com npx playwright test`

Restart the fixture server between full runs (logins are limited to 8 per 10 minutes).

## Windows tip

In Git Bash on Windows, a value such as `API_INTERNAL_URL=/api` typed on the command line is silently rewritten to `C:/Program Files/Git/api`, which breaks server rendering (the log shows `ssr_api_failed` with status 404). Run `export MSYS_NO_PATHCONV=1` first, or use PowerShell. Hostinger (Linux) is not affected.

## Tools

- `node scripts/check-env.mjs`: the build-time environment check, also runnable on its own.
- If a page shows "The experience is temporarily unavailable", the server log has a line `ssr_api_failed` (with the API path and status) or `ssr_api_unreachable` that says why; it never contains secrets.
- `node scripts/render-motion.mjs`: re-renders the motion-graphics videos in `frontend/public/assets/video/motion/`.
