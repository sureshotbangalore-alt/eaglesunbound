# Database setup

The schema has 19 application tables. The Node backend uses the existing MySQL/MariaDB database as it is; it never creates, alters or drops tables on its own.

| Area | Stored information |
| --- | --- |
| Bookings | References, customer contacts, programme, date/time, group size, organisation, consent, status, messages, internal notes and visitor/meal requirements |
| Enquiries | Customer contacts, category, message, consent, follow-up status, internal notes and group/meal requirements |
| Booking history | Status changes and responsible administrator |
| Users and sessions | Roles, active state, argon2id password hashes, hashed session tokens and expiry |
| Programmes, activities, packages | Descriptions, publication, ordering, image references and detailed attributes |
| Website | CMS pages, homepage (including section order and visibility) and business settings |
| Media | URLs, MIME types and categories; files stay in object storage |
| Availability | Programme weekdays and blocked dates |
| Supporting records | FAQs, audit logs, clients, gallery albums, testimonials |

No payment-card data is collected or stored.

## Connection

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (and `DB_SSL`, `DB_SSL_CA` if needed) as environment variables in Hostinger, or in the git-ignored `backend/.env` locally. The legacy `DATABASE_URL` (`mysql://` or `mysql+pymysql://`) is still accepted. TLS with certificate verification is on by default for remote hosts, and off for `DB_HOST=127.0.0.1` (a database on the same server). Never publish environment files.

## Commands

| Command | What it does | Writes? |
| --- | --- | --- |
| `npm run db:check` | Compares the live schema with what the API expects (tables, columns, types) | No (reads `INFORMATION_SCHEMA` only) |
| `npm run db:seed -- --confirm-database=<name>` | Inserts starter content (pages, programmes, activities, FAQs, master catalogue) on an empty database; refuses if homepage content exists | Inserts rows only |
| `npm run db:seed -- --admin-only --confirm-database=<name>` | Creates the administrator from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if that email does not exist | Inserts one row |
| `npm run db:create-user -- --email <address> --role <admin\|staff_viewer> --password-from <ENV_VAR_NAME> --confirm-database=<name>` | Creates one account (same validation as Users & roles); never changes an existing account; the password is read from the named variable and never printed | Inserts one row |

Every command that writes needs **both** `ALLOW_DB_WRITES=true` in the environment and `--confirm-database=<exact database name>` on the command line. Nothing runs automatically during install, build or start.

## Empty database

1. Confirm the selected database is EMPTY, then import `backend/schema/mysql.sql` (phpMyAdmin or the `mysql` client). It contains no credentials, DROP statements or data.
2. Run the two `db:seed` commands above.

There is no migration runner because the schema is unchanged by this release. A future schema change should be a reviewed, additive SQL file applied manually, with a backup first.

## Safeguards

- **Environment precedence:** real environment variables win over `.env` files. If the environment already chooses a database (`DATABASE_URL` or any `DB_*`), `.env` files cannot add or override any database setting, and database settings are never mixed between files. Set `EU_ENV_FILE=backend/.env.staging` to use one specific file instead of `.env` and `backend/.env`.
- **Tests never reach a remote database:** under `node --test`, `NODE_ENV=test` or `EU_AUTOMATED_TEST=true`, the app refuses any database that is not on this machine. Data-writing browser tests refuse a non-local `E2E_BASE_URL`.
- **Writes are off by default:** the running site only writes when `ALLOW_DB_WRITES=true` (see `docs/hostinger-node-deployment.md`). `db:seed` and `db:create-user` additionally need `--confirm-database=<exact database name>`.

## Live database record (7 November 2026)

Hostinger MariaDB 11.8 over verified TLS: 19 application tables, seeded with 10 programmes, 75 activities (including unpublished drafts), 8 content pages, 7 FAQs and one administrator. No bookings or enquiries existed at that time. An old `alembic_version` table may still exist; it is harmless and ignored.

The Node backend's read-only schema check against this database reports `compatible: true` (19 of 19 tables, no problems).
