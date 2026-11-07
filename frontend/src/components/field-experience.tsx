'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Compass, Flag, Footprints, Users, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useMotionPaused } from '@/lib/motion-preference';

export function FieldAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useMotionPaused();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let visible = true;
    const sync = () => el.classList.toggle('is-resting', !visible || document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(el); document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return <div className={`field-atmosphere ${paused ? 'is-paused' : ''}`} ref={ref} aria-hidden="true">
    <div className="cloud-bank cloud-back"/><div className="cloud-bank cloud-front"/>
    <div className="field-grid"/><div className="field-bearing"><span>N</span><Compass strokeWidth={.6}/><small>KARNATAKA / INDIA</small></div>
  </div>;
}
export function MotionSwitch() {
  const paused = useMotionPaused();
  return <button className="field-motion-toggle" aria-pressed={paused} onClick={() => {
    document.documentElement.dataset.adventureMotion = paused ? 'running' : 'paused';
  }}>{paused ? <Play size={13}/> : <Pause size={13}/>}<span>{paused ? 'Motion paused' : 'Pause motion'}</span></button>;
}
const stages = [
  { title: 'Prepare', subtitle: 'Meet your unit.', copy: 'Come together. Get briefed. Find your footing.', icon: Compass, x: 100, y: 270 },
  { title: 'Challenge', subtitle: 'Find your edge.', copy: 'Step into an unfamiliar task. Give it your all.', icon: Footprints, x: 245, y: 140 },
  { title: 'Collaborate', subtitle: 'Move as one.', copy: 'Make a plan. Share the effort. Help each other through.', icon: Users, x: 425, y: 235 },
  { title: 'Reflect', subtitle: 'Take it with you.', copy: 'Pause, reconnect and take the learning beyond the field.', icon: Flag, x: 570, y: 90 },
];
const ROUTE = 'M100 270 Q150 270 170 210 T245 140 Q310 115 345 180 T425 235 Q500 260 510 180 T570 90';
const PHASE_MS = 4800;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function FieldBriefing() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);   // a visitor took control: stop the auto tour
  const [inView, setInView] = useState(false);
  const paused = useMotionPaused();
  const section = useRef<HTMLElement>(null);
  const route = useRef<SVGPathElement>(null);
  const progress = useRef<SVGPathElement>(null);
  const marker = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const motion = useRef({ length: 0, stops: [0, 0, 0, 0], at: 0, frame: 0 });
  const CurrentIcon = stages[active].icon;

  // measure the route once: total length and where each checkpoint sits along it
  useEffect(() => {
    const path = route.current; if (!path) return;
    const length = path.getTotalLength(); const m = motion.current; m.length = length;
    m.stops = stages.map(st => { let best = 0, dist = Infinity; for (let l = 0; l <= length; l += 2) { const p = path.getPointAtLength(l); const d = Math.hypot(p.x - st.x, p.y - st.y); if (d < dist) { dist = d; best = l; } } return best; });
    if (progress.current) progress.current.style.strokeDasharray = `${length} ${length}`;
    place(m.stops[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // only run the tour while the section is on screen
  useEffect(() => {
    const el = section.current; if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(el); return () => observer.disconnect();
  }, []);

  // auto-advance through the four phases until the visitor interacts
  useEffect(() => {
    if (paused || touched || !inView) return;
    const timer = setTimeout(() => setActive(a => (a + 1) % stages.length), PHASE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, touched, inView]);

  function place(at: number) {
    const m = motion.current, path = route.current; if (!path || !m.length) return;
    m.at = at; const p = path.getPointAtLength(at); const q = path.getPointAtLength(Math.min(m.length, at + 1));
    marker.current?.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${(Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI})`);
    if (progress.current) progress.current.style.strokeDashoffset = String(m.length - at);
    if (readout.current) readout.current.textContent = `GRID ${String(Math.round(p.x)).padStart(3, '0')}·${String(Math.round(360 - p.y)).padStart(3, '0')}  ·  ${Math.round((at / m.length) * 100)}% OF ROUTE`;
  }

  // move the unit marker along the route to the active checkpoint
  useEffect(() => {
    const m = motion.current; if (!m.length) return;
    cancelAnimationFrame(m.frame);
    const from = m.at, to = m.stops[active];
    if (paused || from === to) { place(to); return; }
    const started = performance.now(), duration = 700 + Math.abs(to - from) * 2.2;
    const step = (now: number) => { const k = Math.min(1, (now - started) / duration); place(from + (to - from) * easeInOut(k)); if (k < 1) m.frame = requestAnimationFrame(step); };
    m.frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(m.frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused]);

  const choose = (i: number) => { setTouched(true); setActive(i); };
  const touring = !paused && !touched && inView;

  return <section ref={section} className={`field-briefing chapter night ${touring ? 'is-touring' : ''}`} id="field-briefing">
    <div className="chapter-head" data-reveal="rule"><span className="label">02 / The bootcamp</span><span className="label">Military-inspired. Civilian adventure.</span></div>
    <div className="field-briefing-heading"><h2 className="display-xl" data-reveal>One team.<br/><span>Every challenge.</span></h2><p>Explore the spirit of a day in the field.</p></div>
    <div className="field-console" onPointerEnter={() => setTouched(true)} onFocus={() => setTouched(true)}>
      <div className="field-map">
        <div className="map-top"><span>FIELD NOTES / EXPERIENCE ROUTE</span><span className="map-compass"><Compass size={22}/></span></div>
        <svg viewBox="0 0 680 360" role="img" aria-label={`Illustrated experience route. Selected stage: ${stages[active].title}`}>
          <defs>
            <pattern id="fieldSquares" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#a9b48e" strokeOpacity=".12"/></pattern>
            <radialGradient id="sweepFade" cx="0" cy="0" r="1"><stop offset="0" stopColor="#d4bd7f" stopOpacity=".28"/><stop offset="1" stopColor="#d4bd7f" stopOpacity="0"/></radialGradient>
            <filter id="markerGlow" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="4"/></filter>
          </defs>
          <rect width="680" height="360" fill="url(#fieldSquares)"/>
          <g className="map-contours">{[0,1,2,3,4,5].map(i=><ellipse key={i} cx="360" cy="170" rx={80+i*32} ry={35+i*24} transform="rotate(-22 360 170)" fill="none" stroke="#b0bb8b" strokeOpacity=".15"/>)}</g>
          <g className="map-sweep"><path d="M360 170 L360 -150 A320 320 0 0 1 586 -56 Z" fill="url(#sweepFade)" transform="translate(360 170) scale(1) translate(-360 -170)"/><line x1="360" y1="170" x2="360" y2="-150" stroke="#d4bd7f" strokeOpacity=".35"/></g>
          <path ref={route} className="route-dashes" d={ROUTE} fill="none" stroke="#d4bd7f" strokeWidth="2" strokeDasharray="6 8"/>
          <path ref={progress} className="route-progress" d={ROUTE} fill="none" stroke="#edc67b" strokeWidth="3" strokeLinecap="round"/>
          {stages.map((s,i)=><g key={s.title} className={`waypoint ${i < active ? 'is-done' : ''} ${i === active ? 'is-active' : ''}`} onClick={() => choose(i)}>
            {i === active && <><circle className="sonar" cx={s.x} cy={s.y} r="24"/><circle className="sonar sonar-2" cx={s.x} cy={s.y} r="24"/></>}
            <circle className={active===i?'route-pulse':''} cx={s.x} cy={s.y} r={active===i?24:17} fill={i < active ? '#3b3a24' : '#17261c'} stroke={i <= active?'#edc67b':'#758368'} strokeWidth="1.5"/>
            <text x={s.x} y={s.y+4} textAnchor="middle" fill="#ece9d7" fontSize="12" fontFamily="monospace">0{i+1}</text>
            <text x={s.x} y={s.y+44} textAnchor="middle" fill={active===i?'#edc67b':'#9da88f'} fontSize="10" letterSpacing="2">{s.title.toUpperCase()}</text>
          </g>)}
          <g ref={marker} className="route-marker" aria-hidden="true"><circle r="10" fill="#edc67b" opacity=".55" filter="url(#markerGlow)"/><circle r="5" fill="#fff6dc"/><path d="M9 0 L-4 -6 L-1 0 L-4 6Z" fill="#d3312e"/></g>
        </svg>
        <div className="map-foot"><span className="map-note">ILLUSTRATED JOURNEY · NOT A VENUE MAP</span><span className="map-readout" ref={readout} aria-hidden="true"/></div>
      </div>
      <div className="field-stage" aria-live="polite"><div key={active} className="stage-enter"><span className="label">PHASE 0{active+1} / 04</span><span className="stage-icon"><CurrentIcon size={46} strokeWidth={1}/></span><h3>{stages[active].subtitle}</h3><p>{stages[active].copy}</p></div><Link href="/the-bootcamp" className="text-link">Explore the bootcamp <ArrowUpRight size={17}/></Link></div>
      <div className="field-tabs" aria-label="Experience stages">{stages.map((s,i)=><button key={s.title} aria-pressed={active===i} onClick={()=>choose(i)} className={i < active ? 'is-done' : ''}><s.icon size={20}/><span><small>0{i+1}</small>{s.title}</span><ArrowUpRight size={16}/>{active===i && touring && <i key={`bar-${active}`} className="tab-timer" style={{ animationDuration: `${PHASE_MS}ms` }} aria-hidden="true"/>}</button>)}</div>
    </div>
  </section>;
}
