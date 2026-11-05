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
export function FieldBriefing() {
  const [active, setActive] = useState(0);
  const CurrentIcon = stages[active].icon;
  return <section className="field-briefing chapter night" id="field-briefing">
    <div className="chapter-head" data-reveal="rule"><span className="label">02 / The bootcamp</span><span className="label">Military-inspired. Civilian adventure.</span></div>
    <div className="field-briefing-heading"><h2 className="display-xl" data-reveal>One team.<br/><span>Every challenge.</span></h2><p>Explore the spirit of a day in the field.</p></div>
    <div className="field-console">
      <div className="field-map">
        <div className="map-top"><span>FIELD NOTES / EXPERIENCE ROUTE</span><Compass size={22}/></div>
        <svg viewBox="0 0 680 360" role="img" aria-label={`Illustrated experience route. Selected stage: ${stages[active].title}`}>
          <defs><pattern id="fieldSquares" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#a9b48e" strokeOpacity=".12"/></pattern></defs>
          <rect width="680" height="360" fill="url(#fieldSquares)"/>
          {[0,1,2,3,4,5].map(i=><ellipse key={i} cx="360" cy="170" rx={80+i*32} ry={35+i*24} transform="rotate(-22 360 170)" fill="none" stroke="#b0bb8b" strokeOpacity=".15"/>)}
          <path className="route-dashes" d="M100 270 Q150 270 170 210 T245 140 Q310 115 345 180 T425 235 Q500 260 510 180 T570 90" fill="none" stroke="#d4bd7f" strokeWidth="2" strokeDasharray="6 8"/>
          {stages.map((s,i)=><g key={s.title}><circle className={active===i?'route-pulse':''} cx={s.x} cy={s.y} r={active===i?24:17} fill="#17261c" stroke={active===i?'#edc67b':'#758368'} strokeWidth="1.5"/><text x={s.x} y={s.y+4} textAnchor="middle" fill="#ece9d7" fontSize="12" fontFamily="monospace">0{i+1}</text><text x={s.x} y={s.y+44} textAnchor="middle" fill={active===i?'#edc67b':'#9da88f'} fontSize="10" letterSpacing="2">{s.title.toUpperCase()}</text></g>)}
        </svg>
        <span className="map-note">ILLUSTRATED JOURNEY · NOT A VENUE MAP</span>
      </div>
      <div className="field-stage" aria-live="polite"><span className="label">PHASE 0{active+1} / 04</span><CurrentIcon size={46} strokeWidth={1}/><h3>{stages[active].subtitle}</h3><p>{stages[active].copy}</p><Link href="/the-bootcamp" className="text-link">Explore the bootcamp <ArrowUpRight size={17}/></Link></div>
      <div className="field-tabs" aria-label="Experience stages">{stages.map((s,i)=><button key={s.title} aria-pressed={active===i} onClick={()=>setActive(i)}><s.icon size={20}/><span><small>0{i+1}</small>{s.title}</span><ArrowUpRight size={16}/></button>)}</div>
    </div>
  </section>;
}
