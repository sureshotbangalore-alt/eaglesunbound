# Eagles Unbound: launch audit

Reviewed 7 November 2026 on the local development site. This report supersedes historical test counts in earlier design notes. Work was verified on `dev`; the owner subsequently authorised a direct push to `main`.

## Implemented

- Preserved the consolidated public architecture: 13 main pages including the new Cookie Policy. Gallery remains removed. Programme/activity records expand inside their catalogues; retired routes now use permanent 301 redirects.
- Refined military-inspired editorial typography, spacing, photograph framing, navigation, activity filtering and contact/booking forms. Removed the range mini-game and unused tactical components. Cloud motion and restrained storytelling animation remain; reduced-motion and pause controls remain supported. Forms and legal copy render immediately.
- Added equal-prominence consent acceptance/rejection, a native keyboard-accessible preferences dialog, footer settings, 180-day/version renewal, cross-tab synchronisation and fail-closed handling of blocked storage. Necessary storage cannot be disabled. Analytics/marketing are marked unused because none are installed.
- External video sources are not mounted until functional consent. Withdrawal unmounts players. Hero controls were moved above the visual layers so they can be clicked. Locally hosted media remains available without optional consent.
- Added Indian-context Privacy, Cookie, Terms and Booking policies. These explain request-versus-confirmation, no online payments, adult group organisers, optional media and how to contact the team about data. Approved CMS policy overrides continue to work. No cancellation percentages, prices, grievance-officer identity or legal guarantees were invented.
- Added optional administrator MFA: manual authenticator enrolment, password reauthentication, encrypted TOTP secrets, counter replay protection and ten single-use hashed recovery codes. MFA setup expires after ten minutes. Enabling/disabling revokes all sessions. Staff and editors cannot manage MFA.
- Rotated the presented session on successful login; reset/role/status changes revoke all affected sessions, including the administrator's own password reset. Login/logout and MFA actions are audited. Added a hashed-account login limiter alongside the existing socket-IP limiter.
- Retried identical recent booking/enquiry submissions reuse the existing pending request rather than adding another record. This is a short-window duplicate check, not a transactional idempotency service for simultaneous requests.
- Production disables interactive API documentation and OpenAPI. SQLAlchemy exception parameters are redacted and the container disables request access logs to avoid recording customer search queries. Private responses are uncached; API responses carry noindex headers. Oversized declared request lengths are rejected; upload size/type/signature validation and generated object keys remain enforced.
- Added enforcing CSP, frame denial, MIME protection, restricted browser permissions and production HTTPS HSTS. CSP allows inline scripts/styles required by the current cached Next.js/motion architecture; it is not a nonce-based strict CSP. No remote script providers are allowed.
- Added FAQ and programme-list JSON-LD based on the same published content visitors can read. LocalBusiness/breadcrumb markup remains. Sitemap uses real CMS update timestamps and actual policy revision dates; unknown modification dates are omitted. Booking and private routes stay outside the sitemap.
- Search-enabled robots rules distinguish Google/Bing/AI-search crawlers from GPTBot and other named model-training crawlers, which remain blocked. Staging remains blocked from indexing. Added optional Google/Bing ownership verification environment variables and CMS metadata-health warnings for retired paths, duplicate overrides and missing social-image alt text.
- Added source/secret-pattern and locked-Python dependency scanning, plus a GitHub Actions quality workflow with SHA-pinned actions, least-privilege read permissions and isolated fixture data.

## Security findings and resolution

| Severity | Finding | Resolution / status |
| --- | --- | --- |
| High | Known advisories in Starlette request/host handling and multipart parsing | Updated affected pins and compatible FastAPI; re-tested application behaviour. |
| Medium | Existing self-password reset preserved the current session; repeated login retained the presented prior session | Revoke affected sessions and rotate the presented login session; regression-tested. |
| Medium | No administrator second factor | Optional encrypted TOTP/recovery-code support implemented; deployment key and enrolment still required. |
| Medium | Missing CSP and production API-doc suppression | Added production controls and tests; inline-script CSP exception remains documented. |
| Low | pip archive/package handling and pytest temporary-directory advisories | Updated affected build/test pins. |
| Low | Duplicate retries and insufficient contrast in some controls | Added duplicate checks and accessible colour corrections. |

Existing SQLAlchemy queries use bound parameters; customer endpoints require server-side authorisation. Staff is denied by default outside its read-only allowlist and cannot export, edit records, change SEO/content/users or see internal notes. Passwords use Argon2; session tokens are hashed in the database, with HttpOnly/SameSite cookies and Secure required in production. React escapes content, and JSON-LD escapes `<`; there is no customer-controlled HTML execution path identified by this review. These are reviewed controls, not a claim that every vulnerability has been eliminated.

## Dependencies

Security-driven updates: FastAPI 0.121.1 → 0.136.3 (compatibility with the patched Starlette); Starlette 0.49.3 → 1.3.1; python-multipart 0.0.20 → 0.0.31; pytest 9.0.0 → 9.0.3; pip 25.0.1 → 26.2.0. Added cryptography 50.0.2 for authenticated encryption of MFA secrets. Other package versions remain pinned. Both lockfile dependency scans report no known advisories as of this review; `pip check` passes. OSV receives package names/versions only. npm audit reports zero advisories. Advisory status can change after this date.

Primary references: [Starlette advisories](https://github.com/Kludex/starlette/security/advisories), [multipart advisories](https://github.com/Kludex/python-multipart/security/advisories), [Fernet](https://cryptography.io/en/latest/fernet/), [OpenAI crawler controls](https://developers.openai.com/api/docs/bots), [Google lastmod guidance](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping).

## Verification

- Backend: 33 automated tests pass in isolated SQLite databases. Coverage includes public persistence, validation, date blocking, CMS publishing, SEO validation, staff/editor/admin restrictions, exports, session expiry/rotation/reset, MFA enrolment/replay/recovery/denial, upload validation and private-data filtering. Two upstream test-client deprecation warnings remain; no functional test failures.
- HTTP route audit: 120 URLs checked, zero broken URLs, 22 redirects, zero metadata/link warnings. See `route-audit.json`. External services were not probed.
- TypeScript compilation and optimized Next.js production build pass. No framework or frontend-library updates were required.
- Desktop/mobile Playwright covers 28 scenarios, including all 13 public pages, consent, form submission, navigation, admin login and reduced/no-JavaScript behaviour. Confirmed issues were fixed and the affected scenarios re-run. Browser writes use a separate local QA database, not Hostinger customer data.
- Source scan checks selected dangerous-code patterns and embedded private-key/GitHub-token patterns; no findings. It is intentionally not labelled a complete SAST/penetration-test suite.
- No destructive tests, load attacks or intrusive scans were run on production or third-party systems. No live database schema/customer-data changes were required by this audit. MariaDB schema compilation is tested; fresh SQLite migrations and Alembic drift checks pass; container/PostgreSQL execution and a live-host restore drill are not verified here.

## Remaining deployment and business actions

1. Set final HTTPS `PUBLIC_ORIGIN` on the backend and `NEXT_PUBLIC_SITE_URL` on the frontend; use `ENVIRONMENT=production` and `COOKIE_SECURE=true`. The Next.js frontend requires a reachable separately hosted FastAPI service. A Node-only deployment does not run the Python API. Keep database settings on the backend only.
2. Configure `MFA_ENCRYPTION_KEY` as a private Fernet key, back it up separately from the database, and enrol each administrator under Users & roles. Do not change/delete the key while accounts use MFA: use an explicit re-encryption/re-enrolment procedure. Save recovery codes offline. If all factors are lost, use a controlled server-operator recovery process; there is no public MFA bypass.
3. Rotate any credentials previously shared in chat, constrain remote MySQL access to application servers, verify certificate-checked database TLS, and use least-privilege runtime credentials. Use separate migration credentials for schema changes; the current Docker startup migration command requires DDL privileges and should be replaced by a controlled release step on hardened hosting.
4. Configure HTTPS termination, private API routing, edge request/body limits (including chunked requests), trusted proxy boundaries and distributed rate limits/WAF where available. The in-process limiter is per worker, can group users behind a proxy and resets on restart; it is not distributed DDoS protection. Declared-length validation alone does not cap chunked streams. Platform upload limits can be lower than the application's 25 MB cap.
5. Verify encrypted backups, restricted object-storage permissions, restore procedures, log retention and monitoring on the actual host. Optional SMTP/S3 integration requires real configuration; upload writes were tested against a mock storage client, not a live bucket. Antivirus/transcoding is not installed. Do not claim that a magic-byte check validates an entire media file.
6. Have the Indian business approve its legal entity/contact details, grievance contact, retention/deletion schedule, terms, cancellations/refunds, minor-participant arrangements, prices/inclusions and photographs before launch. The site does not yet automatically purge old customer data. Replace labelled concepts/illustrations with approved client media where required.
7. Add real Search Console/Bing verification values, approve content, enable `SEARCH_INDEXING_ENABLED=true` for the production build, redeploy and submit `/sitemap.xml`. Verify the actual host/CDN permits legitimate search crawlers. No ownership account, analytics provider, IndexNow key or Google Business Profile was connected by this task. Analytics would need new consent-gated implementation before installation.
8. Measure field Core Web Vitals after real traffic and a deployed Lighthouse run. Local compilation/accessibility checks are not field CWV or a ranking/citation guarantee. Confirm the hosting plan allows this commercial website and can run the required services.

## Reproduce

From the repository root: `python scripts/security_audit.py`, `python scripts/check-versions.py`, and `python scripts/audit-routes.py --base <local-or-staging-origin>`. From `backend`: `python -m pytest -q` with an explicitly isolated `DATABASE_URL`. From `frontend`: `npm ci`, `npm audit`, `npm run typecheck`, `npm run build`, and Playwright with `E2E_BASE_URL` pointed at the isolated site. Only set `E2E_ALLOW_WRITES=true` for that isolated database. Never run the old CMS mutation helper against production.
