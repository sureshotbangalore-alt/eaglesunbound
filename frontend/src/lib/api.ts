import { internalAPIURL } from './internal-api-url';

export type HomeContent = { eyebrow: string; hero_title: string; hero_secondary?: string; hero_subtitle: string; experience_title: string; experience_description: string; hero_video: string; brand_tagline?:string; sections?: { id: string; visible?: boolean }[] };
export type ContentRecord = { id: string; slug: string; name: string; description: string; image: string; published: boolean; display_order: number; details: Record<string, unknown> };
export type ContactSettings = { phone: string; whatsapp: string; email: string; address: string; whatsapp_message: string; maps_url?: string; business_profile_url?: string; instagram?: string; facebook?: string; youtube?: string };

export async function serverAPI<T>(path: string): Promise<T> {
  // http://127.0.0.1:<PORT>/api on this same process, or an absolute API_INTERNAL_URL (see internal-api-url.ts).
  const base = internalAPIURL();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { cache: 'no-store' as const, signal: AbortSignal.timeout(5000) });
  } catch (error) {
    // Log what failed (path and error kind only, never headers, bodies or the base address) so an operator can diagnose it.
    console.error(JSON.stringify({ event: 'ssr_api_unreachable', path, kind: (error as { cause?: { code?: string } })?.cause?.code || (error as Error)?.name }));
    throw new Error('The experience is temporarily unavailable. Please try again shortly.');
  }
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'ssr_api_failed', path, status: response.status, basePath: new URL(base).pathname }));
    throw new Error('The experience is temporarily unavailable. Please try again shortly.');
  }
  return response.json();
}

export const browserAPIURL = (path: string) => (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '') + path;

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(browserAPIURL(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'EaglesAdmin', ...init.headers },
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: {loc: string[]; msg: string}) => `${e.loc.slice(1).join(' ')}: ${e.msg}`).join('. ') : 'Unable to complete the request. Please try again.');
  }
  return body;
}
