/** Public address used when no absolute API_INTERNAL_URL is set. */
export const DEFAULT_SSR_API_URL = 'https://eagles.ssbsureshot.in/api';

/**
 * HTTP fallback for server-side rendering, used only when the in-process data reader is not available (see api.ts).
 * An API_INTERNAL_URL that starts with http:// or https:// is used as given; anything else (unset, or relative such as /api)
 * uses the public address. It is never relative and never a guessed localhost port.
 */
export function internalAPIURL(env: NodeJS.ProcessEnv = process.env): string {
  const value = (env.API_INTERNAL_URL || '').trim();
  return (/^https?:\/\//i.test(value) ? value : DEFAULT_SSR_API_URL).replace(/\/+$/, '');
}
