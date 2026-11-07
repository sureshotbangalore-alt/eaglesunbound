import type { MetadataRoute } from 'next';
import { siteURL } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const enabled = process.env.SEARCH_INDEXING_ENABLED === 'true';
  const privatePaths = ['/admin', '/api', '/book-now'];
  return {
    rules: enabled ? [
      { userAgent: '*', allow: '/', disallow: privatePaths },
      { userAgent: ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'PerplexityBot'], allow: '/', disallow: privatePaths },
      // Search access does not grant permission for model-training crawlers.
      { userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'], disallow: '/' },
    ] : [{ userAgent: '*', disallow: '/' }],
    sitemap: siteURL() + '/sitemap.xml',
  };
}
