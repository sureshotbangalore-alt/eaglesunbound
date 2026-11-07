'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';
import { CONSENT_DAYS, CONSENT_KEY, CONSENT_VERSION, essentialOnly, readConsent, type ConsentRecord, type Preferences } from '@/lib/consent';

type ConsentContextValue = { ready: boolean; preferences: Preferences; openPreferences: () => void; save: (functional: boolean) => void };
const ConsentContext = createContext<ConsentContextValue>({ ready: false, preferences: essentialOnly, openPreferences: () => {}, save: () => {} });
export const useConsent = () => useContext(ConsentContext);

export function CookieSettingsButton() {
  const { openPreferences } = useConsent();
  return <button type="button" className="cookie-settings-link" onClick={openPreferences}>Cookie settings</button>;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const preferences = record?.preferences || essentialOnly;

  const refresh = useCallback(() => {
    try { setRecord(readConsent(localStorage.getItem(CONSENT_KEY))); } catch { setRecord(null); }
    setReady(true);
  }, []);
  useEffect(() => {
    refresh();
    const changed = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) refresh(); };
    const resumed = () => { if (!document.hidden) refresh(); };
    window.addEventListener('storage', changed);
    document.addEventListener('visibilitychange', resumed);
    return () => { window.removeEventListener('storage', changed); document.removeEventListener('visibilitychange', resumed); };
  }, [refresh]);
  useEffect(() => {
    if (!record) return;
    // Check long-lived tabs without relying on a timeout beyond the browser's integer limit.
    const timer = window.setTimeout(() => {
      if (Date.now() >= record.expiresAt) setRecord(null);
    }, Math.min(record.expiresAt - Date.now(), 2147483647));
    const interval = window.setInterval(() => { if (Date.now() >= record.expiresAt) setRecord(null); }, 60000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [record]);
  useEffect(() => {
    document.documentElement.classList.toggle('has-consent-banner', ready && !record);
    return () => document.documentElement.classList.remove('has-consent-banner');
  }, [ready, record]);
  useEffect(() => {
    if (opened && !dialog.current?.open) dialog.current?.showModal();
    else if (!opened && dialog.current?.open) dialog.current.close();
  }, [opened]);

  const save = useCallback((allowFunctional: boolean) => {
    const savedAt = Date.now();
    const next: ConsentRecord = { version: CONSENT_VERSION, savedAt, expiresAt: savedAt + CONSENT_DAYS * 86400000,
      preferences: { ...essentialOnly, functional: allowFunctional } };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
    setRecord(next); setOpened(false);
    window.dispatchEvent(new CustomEvent('eagles:consent-changed', { detail: next.preferences }));
  }, []);
  const openPreferences = useCallback(() => { setFunctional(preferences.functional); setOpened(true); }, [preferences.functional]);

  return <ConsentContext.Provider value={{ ready, preferences, openPreferences, save }}>
    {children}
    {ready && !record && <aside className="consent-banner" aria-labelledby="consent-banner-title">
      <div className="consent-intro"><ShieldCheck size={21} strokeWidth={1.4}/><h2 id="consent-banner-title">Your visit. Your choice.</h2></div>
      <p>We use essential storage to keep the site working. Optional external media loads only with your permission. We don’t run analytics or advertising trackers.</p>
      <div className="consent-actions"><button type="button" onClick={() => save(false)}>Reject optional</button><button type="button" onClick={() => save(true)}>Accept all</button></div>
      <div className="consent-links"><button type="button" onClick={openPreferences}>Customise preferences</button><Link href="/cookie-policy">Cookie policy</Link></div>
    </aside>}
    <dialog className="consent-dialog" ref={dialog} aria-labelledby="consent-dialog-title" onClose={() => setOpened(false)} onCancel={() => setOpened(false)}>
      <div className="consent-dialog-head"><span className="label">PRIVACY PREFERENCES</span><button type="button" aria-label="Close cookie preferences" onClick={() => setOpened(false)}><X size={21}/></button></div>
      <h2 id="consent-dialog-title">Choose what you allow.</h2>
      <p>Essential features always work. You can change or withdraw optional consent here at any time.</p>
      <div className="consent-categories">
        <label><span><strong>Necessary</strong><small>Remembers your privacy choice and supports secure administrator sign-in. Always active.</small></span><input type="checkbox" checked disabled aria-label="Necessary cookies always enabled"/></label>
        <label><span><strong>Functional</strong><small>Allows externally hosted experience videos. Their providers receive your IP address and may use their own storage. Off until you choose.</small></span><input type="checkbox" checked={functional} onChange={e => setFunctional(e.target.checked)} aria-label="Allow functional media"/></label>
        <label><span><strong>Analytics</strong><small>Not used. No audience analytics service is installed.</small></span><input type="checkbox" checked={false} disabled aria-label="Analytics not used"/></label>
        <label><span><strong>Marketing</strong><small>Not used. No advertising pixels or marketing trackers are installed.</small></span><input type="checkbox" checked={false} disabled aria-label="Marketing not used"/></label>
      </div>
      <p className="consent-note">Your choice is remembered for {CONSENT_DAYS} days on this browser. A policy version change also asks you to choose again. <Link href="/cookie-policy">Read the cookie policy</Link>.</p>
      <div className="consent-dialog-actions"><button type="button" onClick={() => save(false)}>Reject optional</button><button type="button" onClick={() => save(functional)}>Save preferences</button></div>
    </dialog>
    <span className="sr-only" role="status">{storageError ? 'Your choice applies to this visit, but this browser could not save it for future visits.' : ''}</span>
  </ConsentContext.Provider>;
}
