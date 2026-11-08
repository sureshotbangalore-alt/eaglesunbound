'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMotionPaused } from '@/lib/motion-preference';

/* Cinematic motion pieces: the eagle mark, a one-time brand intro, a route-change wipe. All are decorative (aria-hidden) and stop when motion is paused or reduced. */

/** Stylised eagle with flapping wings (pure SVG + CSS). */
export function EagleMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`eagle-mark ${className}`} viewBox="-90 -80 180 120" aria-hidden="true">
      <path className="eagle-wing eagle-wing-back" d="M-6,-2 C4,-40 30,-66 62,-74 L48,-50 L60,-52 L40,-30 L50,-30 L26,-12 L36,-10 L10,2Z" />
      <path className="eagle-body" d="M-70,0 C-40,-12 10,-14 46,-4 L66,0 L46,6 C10,14 -40,12 -70,0Z M-70,0 L-88,-12 L-82,0 L-88,12Z" />
      <path className="eagle-beak" d="M46,-4 L68,1 L46,6Z" />
      <path className="eagle-wing eagle-wing-front" d="M-12,0 C-2,-46 26,-74 60,-80 L46,-54 L58,-56 L38,-32 L48,-32 L22,-12 L32,-10 L4,4Z" />
    </svg>
  );
}

/** Brand intro, once per browser session: the eagle sweeps across, the name appears, the curtain lifts. It never blocks clicks. */
export function IntroReveal() {
  const paused = useMotionPaused();
  const path = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    // only when a visit starts on the home page, so visitors arriving at booking or contact pages are never delayed
    if (paused || path !== '/') return;
    let seen = false; try { seen = sessionStorage.getItem('eu.intro') === '1'; sessionStorage.setItem('eu.intro', '1'); } catch { seen = true; }
    if (seen) return;
    setShow(true); const timer = setTimeout(() => setShow(false), 3700); return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);
  if (!show) return null;
  const letters = (word: string, offset: number) => word.split('').map((ch, i) => <i key={i} style={{ animationDelay: `${1.45 + (offset + i) * 0.045}s` }}>{ch}</i>);
  return (
    <div className="intro-reveal" aria-hidden="true">
      <div className="intro-contours" />
      <span className="intro-corner c1" /><span className="intro-corner c2" /><span className="intro-corner c3" /><span className="intro-corner c4" />
      <div className="intro-scan" />
      <p className="intro-coords">12.79°N · 77.42°E &nbsp;/&nbsp; KANAKAPURA ROAD, BENGALURU</p>
      <div className="intro-eagle"><EagleMark /></div>
      <div className="intro-streak" />
      <div className="intro-logo">
        <svg className="intro-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="80" className="inner" /></svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="intro-logo-img"><img src="/assets/eagles-unbound-logo.png" alt="" width={266} height={102} /><span className="intro-sheen" /></span>
      </div>
      <div className="intro-name"><span>{letters('EAGLES', 0)}</span><span>{letters('UNBOUND', 7)}</span></div>
      <div className="intro-rule" />
      <p className="intro-tag">Military spirit · South Indian soul</p>
    </div>
  );
}

/** A tactical wipe across the screen whenever the page changes. */
export function RouteWipe() {
  const path = usePathname();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  const paused = useMotionPaused();
  useEffect(() => { if (first.current) { first.current = false; return; } setKey(k => k + 1); }, [path]);
  if (paused || key === 0) return null;
  return <div key={key} className="route-wipe" aria-hidden="true"><span /><span /><i>{path === '/' ? 'HOME' : path.slice(1).replace(/-/g, ' ').toUpperCase()}</i></div>;
}
