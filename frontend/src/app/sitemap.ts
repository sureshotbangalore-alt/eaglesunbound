import type { MetadataRoute } from 'next';
import { serverAPI } from '@/lib/api';
import { siteURL, type SEORecord } from '@/lib/seo';
export const revalidate=60;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
const seo=await serverAPI<SEORecord[]>('/public/seo');
return ['/','/the-bootcamp','/what-we-offer','/activities','/about','/founder','/food-and-dining','/contact','/book-now','/privacy-policy','/terms-and-conditions','/booking-policy'].filter(path=>!seo.find(s=>s.page===path)?.noindex).map(path=>({url:siteURL()+path,changeFrequency:'weekly',priority:path==='/'?1:0.7}));
}
