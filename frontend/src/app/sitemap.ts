import type { MetadataRoute } from 'next';
import { serverAPI } from '@/lib/api';
import { siteURL, type SEORecord } from '@/lib/seo';
export const revalidate = 60;
const paths = ['/', '/the-bootcamp', '/what-we-offer', '/activities', '/about', '/founder', '/food-and-dining', '/contact', '/book-now', '/privacy-policy', '/cookie-policy', '/terms-and-conditions', '/booking-policy'];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seo, updates] = await Promise.all([serverAPI<SEORecord[]>('/public/seo'), serverAPI<Record<string,string>>('/public/page-updates')]);
  return paths.filter(path => path !== '/book-now' && !seo.find(s => s.page === path)?.noindex).map(path => {
    // These policy files were actually revised on this date; CMS revisions take precedence.
    const date = updates[path] || (/policy|terms-and/.test(path) ? '2026-11-07' : undefined);
    return {url: siteURL() + path, ...(date ? {lastModified: date} : {})};
  });
}
