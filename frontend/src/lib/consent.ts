export const CONSENT_KEY = 'eu.cookie-preferences';
export const CONSENT_VERSION = 1;
export const CONSENT_DAYS = 180;
export type Preferences = { necessary: true; functional: boolean; analytics: false; marketing: false };
export type ConsentRecord = { version: number; savedAt: number; expiresAt: number; preferences: Preferences };
export const essentialOnly: Preferences = { necessary: true, functional: false, analytics: false, marketing: false };

export function readConsent(value: string | null, now = Date.now()): ConsentRecord | null {
  try {
    const record = JSON.parse(value || 'null');
    if (!record || record.version !== CONSENT_VERSION || !Number.isFinite(record.savedAt) || !Number.isFinite(record.expiresAt)
      || record.savedAt > now || record.expiresAt <= now || record.expiresAt > record.savedAt + CONSENT_DAYS * 86400000
      || record.preferences?.necessary !== true || typeof record.preferences.functional !== 'boolean'
      || record.preferences.analytics !== false || record.preferences.marketing !== false) return null;
    return record;
  } catch { return null; }
}

export function needsMediaConsent(src: string, origin: string): boolean {
  try { return new URL(src, origin).origin !== origin; } catch { return true; }
}
