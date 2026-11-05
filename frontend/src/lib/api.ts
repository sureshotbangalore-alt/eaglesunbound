export type HomeContent = { eyebrow: string; hero_title: string; hero_secondary?: string; hero_subtitle: string; experience_title: string; experience_description: string; hero_video: string; brand_tagline?:string };
export type ContentRecord = { id: string; slug: string; name: string; description: string; image: string; published: boolean; display_order: number; details: Record<string, unknown> };
export type ContactSettings = { phone: string; whatsapp: string; email: string; address: string; whatsapp_message: string; maps_url?: string; business_profile_url?: string; instagram?: string; facebook?: string; youtube?: string };

export async function serverAPI<T>(path: string): Promise<T> {
  const response = await fetch(`${process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000'}${path}`, { ...(path.startsWith('/public/') ? { next: { revalidate: 60 } } : { cache: 'no-store' as const }), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('The experience is temporarily unavailable. Please try again shortly.');
  return response.json();
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'EaglesAdmin', ...init.headers },
    credentials: 'same-origin',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: {loc: string[]; msg: string}) => `${e.loc.slice(1).join(' ')}: ${e.msg}`).join('. ') : 'Unable to complete the request. Please try again.');
  }
  return body;
}
