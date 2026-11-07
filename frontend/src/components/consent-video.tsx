'use client';
import { useEffect, useState } from 'react';
import { useConsent } from './cookie-consent';
import { needsMediaConsent } from '@/lib/consent';

export function ConsentVideo({ src, label }: { src: string; label: string }) {
  const { ready, preferences, openPreferences } = useConsent();
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(location.origin), []);
  const allowed = ready && origin && (!needsMediaConsent(src, origin) || preferences.functional);
  return allowed ? <video key={src} controls playsInline preload="none" src={src} aria-label={label}/> : <div className="media-consent-placeholder"><p className="label">EXPERIENCE FILM</p><h3>A moment from the field.</h3><p>This film is hosted externally. Enable functional media to load it.</p><button className="button button-light" type="button" onClick={openPreferences}>Manage media preferences</button></div>;
}
