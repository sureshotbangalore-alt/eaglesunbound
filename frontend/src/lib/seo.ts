import type { Metadata } from 'next';
import { serverAPI } from './api';
export type SEORecord = { page: string; title: string; description: string; canonical: string; og_title: string; og_description: string; image: string; image_alt: string; noindex: boolean };
export type FAQRecord = { id: string; question: string; answer: string; page: string; published: boolean; display_order: number };
// Public address of the site: NEXT_PUBLIC_SITE_URL, else the first CORS_ORIGINS entry, read when the page renders.
const firstOrigin = (list?: string) => (list || '').split(',').map(x => x.trim()).find(Boolean) || '';
export const siteURL = () => (process.env.NEXT_PUBLIC_SITE_URL || firstOrigin(process.env.CORS_ORIGINS) || 'http://localhost:3000').replace(/\/$/, '');
export async function pageMetadata(page: string, title: string, description: string): Promise<Metadata> {
  const all = await serverAPI<SEORecord[]>('/public/seo');
  const seo = all.find(s => s.page === page);
  const image = seo?.image || '/assets/eagles-unbound-logo.png';
  return {
    title: seo?.title ? (/eagles unbound/i.test(seo.title) ? { absolute: seo.title } : seo.title) : title, // a CMS title that already names the brand skips the automatic suffix
    description: seo?.description || description,
    alternates: { canonical: seo?.canonical || page },
    robots: page === '/book-now' || seo?.noindex || process.env.SEARCH_INDEXING_ENABLED !== 'true' ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: seo?.og_title || seo?.title || title, description: seo?.og_description || seo?.description || description, url: seo?.canonical || page, images: [{ url: image, alt: seo?.image_alt || 'Eagles Unbound official logo' }] },
    twitter: { card: 'summary_large_image', title: seo?.og_title || seo?.title || title, description: seo?.og_description || seo?.description || description, images: [image] },
  };
}
