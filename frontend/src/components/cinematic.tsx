'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMotionPaused } from '@/lib/motion-preference';

/* Cinematic motion pieces: the eagle mark, a one-time brand intro, a route-change wipe, a gliding eagle for hero skies
   and animated activity vignettes. All are decorative (aria-hidden) and stop when motion is paused or reduced. */

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
    setShow(true); const timer = setTimeout(() => setShow(false), 2300); return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);
  if (!show) return null;
  return (
    <div className="intro-reveal" aria-hidden="true">
      <div className="intro-grid" />
      <div className="intro-eagle"><EagleMark /></div>
      <div className="intro-name"><span>EAGLES</span><span>UNBOUND</span></div>
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

/** An eagle that glides across a hero sky every few seconds. */
export function EagleGlide() {
  return <div className="eagle-glide" aria-hidden="true"><EagleMark /></div>;
}

const scenes = {
  zip: { label: 'Zip line', body: (
    <>
      <line x1="10" y1="22" x2="150" y2="88" className="v-cable" />
      <rect x="6" y="18" width="5" height="80" className="v-post" /><rect x="148" y="84" width="5" height="40" className="v-post" />
      <g className="v-rider"><rect x="-6" y="-4" width="12" height="7" rx="2" className="v-red" /><line x1="0" y1="3" x2="0" y2="22" className="v-line" /><circle cx="0" cy="27" r="5" className="v-fill" /></g>
    </>) },
  wall: { label: 'Wall climb', body: (
    <>
      <rect x="40" y="10" width="80" height="110" rx="3" className="v-frame" />
      {[[60, 104], [78, 88], [64, 70], [88, 56], [70, 40], [92, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" className="v-hold" style={{ animationDelay: `${i * 0.45}s` }} />)}
      <circle r="5.5" className="v-fill v-climber" />
    </>) },
  archery: { label: 'Archery', body: (
    <>
      <g className="v-target">{[22, 16, 10, 4].map((r, i) => <circle key={r} cx="122" cy="62" r={r} className={i % 2 ? 'v-red' : 'v-paper'} />)}</g>
      <g className="v-arrow"><line x1="-34" y1="0" x2="0" y2="0" className="v-shaft" /><path d="M2,0 L-6,-4 L-6,4Z" className="v-fill" /><path d="M-30,0 L-37,-5 L-34,0 L-37,5Z" className="v-red" /></g>
      <circle cx="122" cy="62" r="24" className="v-ring" />
    </>) },
  rope: { label: 'Rope course', body: (
    <>
      <rect x="10" y="40" width="5" height="80" className="v-post" /><rect x="146" y="40" width="5" height="80" className="v-post" />
      <path d="M12,48 Q80,84 148,48" className="v-rope" /><path d="M12,70 Q80,106 148,70" className="v-rope v-rope-2" />
      <circle r="5" className="v-fill v-walker" />
    </>) },
} as const;

/** Four small looping line-art scenes of the activities (zip line, wall climb, archery, rope course). */
export function ActivityVignettes({ only }: { only?: (keyof typeof scenes)[] }) {
  const list = (only || (Object.keys(scenes) as (keyof typeof scenes)[]));
  return (
    <ul className="vignettes" data-stagger aria-label="Activities in motion">
      {list.map(id => (
        <li key={id} className={`vignette v-${id}`}>
          <svg viewBox="0 0 160 130" aria-hidden="true">{scenes[id].body}</svg>
          <span className="label">{scenes[id].label}</span>
        </li>
      ))}
    </ul>
  );
}
