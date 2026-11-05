import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  poweredByHeader: false,
  async redirects() {
    return [
      {source:'/activities/:slug',destination:'/activities#:slug',statusCode:307},
      {source:'/programmes/:slug',destination:'/what-we-offer#:slug',statusCode:307},
      {source:'/packages/:slug',destination:'/what-we-offer',statusCode:307},
      {source:'/corporate',destination:'/what-we-offer#corporate',statusCode:307},
      {source:'/schools-and-colleges',destination:'/what-we-offer#schools-and-colleges',statusCode:307},
      {source:'/kids-experiences',destination:'/what-we-offer#kids-experiences',statusCode:307},
      {source:'/accommodation',destination:'/food-and-dining#stay',statusCode:307},
      {source:'/mission-selector',destination:'/what-we-offer',statusCode:307},
      {source:'/faqs',destination:'/contact#faqs',statusCode:307},
      {source:'/gallery',destination:'/activities',statusCode:307},
      {source:'/packages',destination:'/what-we-offer',statusCode:307},
      {source:'/clients',destination:'/about',statusCode:307},
      {source:'/testimonials',destination:'/about',statusCode:307},
      {source:'/explore',destination:'/activities',statusCode:307},
      {source:'/kids',destination:'/kids-experiences',statusCode:301},
      {source:'/schools',destination:'/schools-and-colleges',statusCode:301},
      {source:'/colleges',destination:'/programmes/college-adventure-program',statusCode:301},
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
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000'}/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default nextConfig;
