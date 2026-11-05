'use client';
import { useEffect, useRef, type CSSProperties } from 'react';

/*
 * Forces-inspired motion graphics. Pure SVG + CSS: no canvas, no characters.
 * Animations pause off-screen (.is-resting), and stop for reduced motion or the site's pause switch.
 */

function useResting<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-resting', !e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

/** Radar scope: rotating sweep, range rings and contacts that flash as the beam passes them. */
export function Radar({ label = 'Field scan', contacts = [[52, 0.55], [140, 0.78], [205, 0.35], [300, 0.68]], className = '' }: { label?: string; contacts?: [number, number][]; className?: string }) {
  const ref = useResting<HTMLDivElement>();
  return <div ref={ref} className={`radar ${className}`} aria-hidden="true">
    <svg viewBox="0 0 320 320">
      {[40, 80, 120, 156].map(r => <circle key={r} cx="160" cy="160" r={r} className="rd-ring"/>)}
      <path d="M160 0V320M0 160H320" className="rd-cross"/>
      {ticks.map(a => <line key={a} x1="160" y1="2" x2="160" y2={a % 30 === 0 ? 14 : 8} transform={`rotate(${a} 160 160)`} className="rd-tick"/>)}
      {[0, 90, 180, 270].map((a, i) => <text key={a} x="160" y="30" transform={`rotate(${a} 160 160)`} className="rd-deg">{['N', 'E', 'S', 'W'][i]}</text>)}
    </svg>
    <div className="rd-sweep"/>
    {contacts.map(([angle, dist], i) => {
      const rad = (angle - 90) * Math.PI / 180;
      return <span key={i} className="rd-blip" style={{ left: `${50 + Math.cos(rad) * dist * 48.75}%`, top: `${50 + Math.sin(rad) * dist * 48.75}%`, '--delay': `${(angle / 360) * 4}s` } as CSSProperties}/>;
    })}
    <div className="rd-readout"><span>{label}</span><span className="rd-bearing">BRG <b/>°</span></div>
  </div>;
}

// An arrow stuck in a surface: buried tip with a splintered entry hole, angled shaft, two fletching vanes and a nock.
const ARROW_SVG = '<svg viewBox="0 0 120 120" class="arrow-svg"><g class="ah-splinters"><path d="M60 60l-9-4M60 60l-6 8M60 60l3 10M60 60l9 3"/></g><circle cx="60" cy="60" r="4.2" class="ah-hole"/><g class="ah-body"><line x1="63" y1="63" x2="107" y2="19" class="ah-shadow"/><line x1="60" y1="60" x2="104" y2="16" class="ah-shaft"/><polygon points="90.8,29.2 101.8,18.2 108.9,20.9 94,28.8" class="ah-vane"/><polygon points="90.8,29.2 101.8,18.2 99.1,11.1 91.2,26" class="ah-vane ah-vane2"/><line x1="102.2" y1="14.2" x2="105.8" y2="17.8" class="ah-nock"/></g></svg>';

/** Range target with a scope that steps to each hit before it lands. Plays once when revealed. */
export function RangeTarget({ caption = 'Archery & air rifle range' }: { caption?: string }) {
  const ref = useResting<HTMLDivElement>();
  const hits: [number, number][] = [[-6, 4], [10, -8], [2, 14], [-14, -10], [4, -2]];
  // Click the target: an arrow lands exactly there and quivers.
  const shoot = (e: React.MouseEvent<HTMLDivElement>) => {
    const host = e.currentTarget;
    const r = host.querySelector('svg')!.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    const arrow = document.createElement('span');
    arrow.className = 'arrow-hit';
    arrow.style.left = `${x}px`;
    arrow.style.top = `${y}px`;
    arrow.style.setProperty('--tilt', `${Math.round(-30 + Math.random() * 60)}deg`);
    arrow.innerHTML = ARROW_SVG;
    host.appendChild(arrow);
    keepRecent(host, '.arrow-hit');
  };
  return <div ref={ref} className="range-target" data-reveal="target" aria-hidden="true" onClick={shoot}>
    <svg viewBox="0 0 300 300">
      {[140, 126, 112, 98, 84, 70, 56, 42, 28, 14].map((r, i) => <circle key={r} cx="150" cy="150" r={r} className={`rt-ring rt-${Math.floor(i / 2)}`}/>)}
      <path d="M150 0V300M0 150H300" className="rt-cross"/>
      {hits.map(([x, y], i) => <g key={i} className="rt-hit" style={{ '--i': i } as CSSProperties} transform={`translate(${150 + x * 3} ${150 + y * 3})`}><circle r="4.5"/><circle r="10" className="rt-ripple"/></g>)}
    </svg>
    <div className="rt-scope">
      <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56"/><path d="M60 0V46M60 74V120M0 60H46M74 60H120"/>{[-24, -12, 12, 24].map(o => <g key={o}><circle cx={60 + o} cy="60" r="1.6"/><circle cx="60" cy={60 + o} r="1.6"/></g>)}</svg>
    </div>
    <p className="rt-caption"><span>{caption}</span><span className="rt-status"><i>Locking…</i><i>Group confirmed</i></span></p>
  </div>;
}

const MAX_MARKS = 7;
function keepRecent(host: HTMLElement, selector: string) {
  const marks = host.querySelectorAll(selector);
  for (let i = 0; i < marks.length - MAX_MARKS; i++) marks[i].remove();
}

/** Full, uncropped portrait in a framed box with animated tactical graphics around it. */
export function PortraitFrame({ src, alt, name, tagTop, tagSide, stamp }: { src: string; alt: string; name: string; tagTop: string; tagSide: string; stamp?: string }) {
  const ref = useResting<HTMLElement>();
  return <figure ref={ref} className="pframe" data-reveal="frame">
    <svg className="pf-rings" viewBox="0 0 400 400" aria-hidden="true">
      <g className="pf-ring-outer">{Array.from({ length: 120 }, (_, i) => <line key={i} x1="200" y1="6" x2="200" y2={i % 10 === 0 ? 22 : 13} transform={`rotate(${i * 3} 200 200)`}/>)}<circle cx="200" cy="200" r="194"/></g>
      <g className="pf-ring-inner"><circle cx="200" cy="200" r="178" strokeDasharray="4 10"/><path d="M200 14v18M200 368v18M14 200h18M368 200h18"/></g>
    </svg>
    <div className="pf-box">
      <img src={src} alt={alt} width={447} height={447}/>
      <span className="pf-scan" aria-hidden="true"/>
      <span className="pf-grid" aria-hidden="true"/>
      <i className="pf-c tl"/><i className="pf-c tr"/><i className="pf-c bl"/><i className="pf-c br"/>
      <span className="pf-reticle" aria-hidden="true"/>
    </div>
    <span className="pf-tag pf-top" aria-hidden="true"><i/>{tagTop}</span>
    <span className="pf-tag pf-side" aria-hidden="true">{tagSide}</span>
    {stamp && <span className="pf-stamp" aria-hidden="true">{stamp}</span>}
    <figcaption><span className="label">Founder &amp; CEO</span><strong>{name}</strong></figcaption>
  </figure>;
}

/** HUD frame for heroes: scan line plus corner readouts. */
export function HudFrame({ left = 'Sector: Kanakapura Road', right = 'Status: Field ready' }: { left?: string; right?: string }) {
  return <div className="hud" aria-hidden="true">
    <span className="hud-scan"/>
    <span className="hud-tl">{left}</span>
    <span className="hud-tr">{right}<i/></span>
    <span className="hud-ruler"/>
  </div>;
}
