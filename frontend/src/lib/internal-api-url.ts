/**
 * Base URL for server-side rendering calls to the API, ending in /api (no trailing slash).
 * - API_INTERNAL_URL that starts with http:// or https:// is used as given (for a host whose proxy needs the public URL).
 * - Otherwise (unset, or relative such as /api) the API on this same process is used: 127.0.0.1 and the port from
 *   process.env.PORT, read on every call. 3000 is only the fallback when no PORT is provided.
 */
export function internalAPIURL(env: NodeJS.ProcessEnv = process.env): string {
  const value = (env.API_INTERNAL_URL || '').trim();
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  const path = (value || '/api').replace(/^\/*/, '/').replace(/\/+$/, '') || '/api';
  const port = (env.PORT || '').trim() || '3000';
  return `http://127.0.0.1:${port}${path}`;
}
