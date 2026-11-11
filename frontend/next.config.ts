import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';
// Hostinger may provide settings in a .env file at the repository root rather than as real environment variables.
// Read only the public, non-secret settings the frontend needs from it. Real environment variables always win.
const repoRoot = fs.existsSync(path.join(process.cwd(), 'backend')) ? process.cwd() : path.resolve(process.cwd(), '..');
const frontendKeys = /^(NEXT_PUBLIC_[A-Z0-9_]+|CORS_ORIGINS|SEARCH_INDEXING_ENABLED|GOOGLE_SITE_VERIFICATION|BING_SITE_VERIFICATION)$/;
try {
  for (const raw of fs.readFileSync(path.join(repoRoot, '.env'), 'utf8').split(/\r?\n/)) {
    if (raw.trim().startsWith('#')) continue;
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || !frontendKeys.test(m[1]) || process.env[m[1]]) continue;
    process.env[m[1]] = /^".*"$|^'.*'$/.test(m[2]) ? m[2].slice(1, -1) : m[2].replace(/\s+#.*$/, '');
  }
} catch { /* no root .env file: use the real environment only */ }
// Public site URL baked in at build time: NEXT_PUBLIC_SITE_URL, or else the first CORS_ORIGINS entry (the public https origin).
const firstOrigin = (list?: string) => (list || '').split(',').map(x => x.trim().replace(/\/$/, '')).find(Boolean) || '';
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || firstOrigin(process.env.CORS_ORIGINS)).replace(/\/$/, '');
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob:",
  "font-src 'self'",
  `connect-src 'self'${process.env.NODE_ENV !== 'production' ? ' ws: wss:' : ''}`,
  "frame-src 'none'", "frame-ancestors 'none'", "object-src 'none'",
  "base-uri 'self'", "form-action 'self'",
  ...(process.env.NODE_ENV === 'production' && siteUrl.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
].join('; ');
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  poweredByHeader: false,
  // Hostinger caps an account at 120 processes: build with threads, not many child processes.
  experimental: { cpus: 2, workerThreads: true },
  ...(siteUrl ? { env: { NEXT_PUBLIC_SITE_URL: siteUrl } } : {}),
  async redirects() {
    return [
      {source:'/activities/:slug',destination:'/activities#:slug',statusCode:301},
      {source:'/programmes/:slug',destination:'/what-we-offer#:slug',statusCode:301},
      {source:'/packages/:slug',destination:'/what-we-offer',statusCode:301},
      {source:'/corporate',destination:'/what-we-offer#corporate',statusCode:301},
      {source:'/schools-and-colleges',destination:'/what-we-offer#schools-and-colleges',statusCode:301},
      {source:'/kids-experiences',destination:'/what-we-offer#kids-experiences',statusCode:301},
      {source:'/accommodation',destination:'/food-and-dining#stay',statusCode:301},
      {source:'/mission-selector',destination:'/what-we-offer',statusCode:301},
      {source:'/faqs',destination:'/contact#faqs',statusCode:301},
      {source:'/gallery',destination:'/activities',statusCode:301},
      {source:'/packages',destination:'/what-we-offer',statusCode:301},
      {source:'/clients',destination:'/about',statusCode:301},
      {source:'/testimonials',destination:'/about',statusCode:301},
      {source:'/explore',destination:'/activities',statusCode:301},
      {source:'/kids',destination:'/what-we-offer#kids-experiences',statusCode:301},
      {source:'/schools',destination:'/what-we-offer#schools-and-colleges',statusCode:301},
      {source:'/colleges',destination:'/what-we-offer#college-adventure-program',statusCode:301},
      {source:'/programs',destination:'/what-we-offer',statusCode:301},
      {source:'/food',destination:'/food-and-dining',statusCode:301},
      {source:'/bootcamp',destination:'/the-bootcamp',statusCode:301},
      {source:'/programmes',destination:'/what-we-offer',statusCode:301},
      {source:'/book',destination:'/book-now',statusCode:301},
      {source:'/privacy',destination:'/privacy-policy',statusCode:301},
      {source:'/terms',destination:'/terms-and-conditions',statusCode:301},
      {source:'/contact-us',destination:'/contact',statusCode:301},
      {source:'/about-us',destination:'/about',statusCode:301},
      {source:'/day-package',destination:'/what-we-offer',statusCode:301},
    ];
  },
  // No on-the-fly image resizing: it times out on the shared host (503). Photos have pre-built widths instead.
  images: { loader: 'custom', loaderFile: './src/lib/image-loader.ts' },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      ...(process.env.NODE_ENV === 'production' && siteUrl.startsWith('https://') ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] },
    // Photos, clips, films and fonts: browsers keep them for a day and may serve them for 30 days while refreshing in
    // the background. File names are not versioned, so a replaced file still reaches returning visitors within a day.
    ...['/media/:path*', '/assets/:path*'].map(source => ({ source, headers: [
      { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000' },
    ] }))];
  },
};
export default nextConfig;
