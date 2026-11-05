# Lightweight hosting preparation

## Hosting constraint

Vercel Hobby is for personal, non-commercial use: https://vercel.com/docs/plans/hobby . This business site needs a plan/host that permits commercial use.

## Changes

- Empty Packages, Clients and Testimonials listings redirect temporarily to Programmes/About. The duplicate Explore browser redirects to Activities. Their navigation and sitemap entries are removed; content remains recoverable if approved content becomes available.
- Public server-side API reads revalidate every 60 seconds. The public layout no longer forces every route to render dynamically. Booking/enquiry submissions and authenticated client API calls remain uncached. CMS changes may take about a minute plus background revalidation to appear publicly.
- Removed the global scope cursor, click-impact effects and custom wheel scrolling from public layout. Main heading reveals and visual scene animation remain.
- Removed two unused original PNGs (5.55 MB combined) from public assets. They are preserved under output/imagegen; the website already uses their JPEG versions (0.69 MB combined).

## Vercel setup

Set the project root to `frontend` and use its existing build command. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS website origin. Set `API_INTERNAL_URL` to a reachable hosted FastAPI backend, without a trailing slash. Do not set NEXT_BUILD_DIR on Vercel; its default is .next.

The current FastAPI backend and database require their own deployment. Vercel cannot reach the developer laptop's 127.0.0.1:8000. Use a persistent PostgreSQL database and persistent object storage for media; local SQLite/files are not a production persistence solution on serverless hosting. Backend session/CORS/cookie settings must match the final site origin. Database migrations and secrets must be configured on the backend host.

This is a frontend optimization pass, not a completed cloud deployment. No hosting account or database was provisioned.

Programme and activity detail pages remain: they share route templates and provide useful direct links, so deleting them would lose information without proportionately reducing the browser bundle. Public-content caching reduces repeated backend traffic; production build output verifies which routes are prerendered.
