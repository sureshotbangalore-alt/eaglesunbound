# Database setup

The schema contains 19 application tables plus Alembic migration tracking.

| Area | Stored information |
| --- | --- |
| Bookings | References, customer contacts, programme, date/time, group size, organisation, consent, status, messages, internal notes and additional visitor/meal requirements |
| Enquiries | Customer contacts, category, message, consent, follow-up status, internal notes and group/meal requirements |
| Booking history | Status changes and responsible administrator |
| Users and sessions | Roles, active state, password hashes, hashed session tokens and expiry |
| Programmes and activities | Descriptions, publication, ordering, image references, detailed attributes and programme/activity relationships |
| Website | CMS pages, homepage and business settings |
| Media | URLs, MIME types and categories; files remain in object storage |
| Availability | Programme weekdays and blocked dates |
| Supporting records | FAQs, audit logs and existing legacy client/package/gallery/testimonial records |

No payment-card data is collected or stored.

## Connection configuration

The backend supports PostgreSQL, local SQLite and mysql+pymysql connections. Save DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD in the private backend .env. Leave DATABASE_URL blank to select DB_*; an explicit DATABASE_URL takes priority. Special password characters are encoded automatically. TLS verification is enabled by default; DB_SSL_CA can select a trusted CA file.

Production also requires ENVIRONMENT=production, COOKIE_SECURE=true and PUBLIC_ORIGIN set to the final website origin. Authentication and storage settings are configured separately. Never publish environment files.

## Empty-database setup

After confirming the selected database is empty, run from backend:

```powershell
..\.venv\Scripts\python -m alembic upgrade head
..\.venv\Scripts\python -m app.seed
```

Seeding adds initial content and an administrator using configured credentials. It does not transfer existing local customer records; those require a separate reviewed import.

If remote access is unavailable, schema/mysql.sql can be imported through phpMyAdmin into an EMPTY selected database. It includes migration tracking and contains no credentials, DROP statements or customer data. Do not import it into an existing populated database.

## Live setup - 7 November 2026

Hostinger MariaDB 11.8.9 is connected with verified TLS. Both migrations were applied; the database is at revision d4ad483574dc, with 19 application tables plus migration tracking. Alembic check reports no pending schema changes.

Initial seed totals: 10 programme records, 75 activity records (including unpublished drafts), 8 content pages, 2 settings records, 7 FAQs and 1 bootstrap administrator. Bookings and enquiries both contain zero rows. No local customer records were imported.

Read-only API checks for homepage, programmes, activities and settings returned HTTP 200 against Hostinger. The private backend .env now selects MySQL; the previous local configuration is preserved in a Git-ignored backup. Running backend processes must be restarted to reload the new environment. No credentials are included in this document.
