'use client';
import { useEffect, useState } from 'react';

/** True once the page's own resources have loaded (window "load"), so heavy extras such as background films can wait
 *  until the text, styles and first image are on screen. */
export function usePageLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (document.readyState === 'complete') { setLoaded(true); return; }
    const done = () => setLoaded(true);
    window.addEventListener('load', done, { once: true });
    return () => window.removeEventListener('load', done);
  }, []);
  return loaded;
}
