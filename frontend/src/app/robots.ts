import type { MetadataRoute } from 'next';
import { siteURL } from '@/lib/seo';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots {
  return {rules:process.env.SEARCH_INDEXING_ENABLED==='true'?{userAgent:'*',allow:'/',disallow:['/admin','/api','/book-now']}:{userAgent:'*',disallow:'/'},sitemap:siteURL()+'/sitemap.xml'};
}
