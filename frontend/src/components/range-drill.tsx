'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Crosshair, RotateCcw, Timer, Trophy } from 'lucide-react';

/*
 * Field Drill — an opt-in 30-second target game. Targets are DOM/SVG elements moved with
 * requestAnimationFrame (no canvas). Nothing runs until the visitor presses Start.
 */

type Kind = 'drone' | 'jet' | 'rocket' | 'launcher';
type Target = { id: number; kind: Kind; el: HTMLButtonElement; x: number; y: number; vx: number; vy: number; wobble: number; t: number };

const SPEC: Record<Kind, { points: number; speed: [number, number]; label: string }> = {
  drone: { points: 10, speed: [70, 120], label: 'Drone' },
  launcher: { points: 15, speed: [60, 90], label: 'Launcher' },
  jet: { points: 25, speed: [260, 360], label: 'Jet' },
  rocket: { points: 50, speed: [200, 280], label: 'Rocket' },
};

const ART: Record<Kind, string> = {
  drone: '<svg viewBox="0 0 64 40"><rect x="22" y="16" width="20" height="9" rx="3"/><path d="M8 12h18M38 12h18M17 12v6M47 12v6"/><ellipse cx="17" cy="11" rx="10" ry="2" class="rotor"/><ellipse cx="47" cy="11" rx="10" ry="2" class="rotor"/><circle cx="32" cy="29" r="3"/></svg>',
  jet: '<svg viewBox="0 0 80 32"><path d="M4 16 L58 12 L76 16 L58 20 Z"/><path d="M30 13 L44 2 L50 2 L42 13 Z M30 19 L44 30 L50 30 L42 19 Z M8 14 L4 6 L12 6 L16 14 Z M8 18 L4 26 L12 26 L16 18 Z"/></svg>',
  rocket: '<svg viewBox="0 0 70 24"><path d="M6 12 L48 6 L64 12 L48 18 Z"/><path d="M12 7 L4 1 L10 1 L18 7 Z M12 17 L4 23 L10 23 L18 17 Z"/><path d="M6 12 L-10 9 L-4 12 L-10 15 Z" class="flame"/></svg>',
  launcher: '<svg viewBox="0 0 84 44"><rect x="6" y="22" width="60" height="12" rx="2"/><path d="M20 22 L46 6 L52 10 L28 24 Z"/><circle cx="16" cy="38" r="5"/><circle cx="36" cy="38" r="5"/><circle cx="56" cy="38" r="5"/></svg>',
};

const DURATION = 30;

export function RangeDrill() {
  const arena = useRef<HTMLDivElement>(null);
  const targets = useRef<Target[]>([]);
  const frame = useRef(0);
  const nextId = useRef(0);
  const [state, setState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const lastHit = useRef(0);
  const comboRef = useRef(0);

  useEffect(() => { try { setBest(Number(localStorage.getItem('eu-drill-best') || 0)); } catch { /* storage unavailable */ } }, []);

  const clearTargets = () => { targets.current.forEach(t => t.el.remove()); targets.current = []; };

  const pop = (x: number, y: number, text: string, big = false) => {
    const box = arena.current; if (!box) return;
    const el = document.createElement('span');
    el.className = `drill-boom${big ? ' big' : ''}`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.innerHTML = `<i class="db-flash"></i><i class="db-ring"></i>${'<i class="db-bit"></i>'.repeat(8)}<b>${text}</b>`;
    box.appendChild(el);
    window.setTimeout(() => el.remove(), 1100);
  };

  const spawn = useCallback(() => {
    const box = arena.current; if (!box) return;
    const w = box.clientWidth, h = box.clientHeight;
    const roll = Math.random();
    const kind: Kind = roll < 0.4 ? 'drone' : roll < 0.62 ? 'launcher' : roll < 0.85 ? 'jet' : 'rocket';
    const spec = SPEC[kind];
    const fromLeft = Math.random() > 0.5;
    const speed = spec.speed[0] + Math.random() * (spec.speed[1] - spec.speed[0]);
    const el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.className = `drill-target dt-${kind}${fromLeft ? '' : ' flip'}`;
    el.setAttribute('aria-label', `${spec.label} target`);
    el.innerHTML = ART[kind];
    const y = kind === 'launcher' ? h - 64 : kind === 'rocket' ? h * (0.55 + Math.random() * 0.3) : 30 + Math.random() * (h * 0.6);
    const t: Target = { id: nextId.current++, kind, el, x: fromLeft ? -90 : w + 10, y, vx: fromLeft ? speed : -speed, vy: kind === 'rocket' ? -(60 + Math.random() * 70) : 0, wobble: Math.random() * 6, t: 0 };
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const r = box.getBoundingClientRect();
      const now = performance.now();
      const chain = now - lastHit.current < 1200;
      lastHit.current = now;
      const n = chain ? comboRef.current + 1 : 1;
      comboRef.current = n;
      const pts = spec.points * Math.min(n, 4);
      setCombo(n);
      setScore(s => s + pts);
      pop(e.clientX - r.left, e.clientY - r.top, n > 1 ? `+${pts} ×${Math.min(n, 4)}` : `+${pts}`, kind === 'rocket' || kind === 'jet');
      setHits(v => v + 1);
      setShots(v => v + 1);
      el.remove();
      targets.current = targets.current.filter(x => x.id !== t.id);
    });
    box.appendChild(el);
    targets.current.push(t);
  }, []);

  useEffect(() => {
    if (state !== 'playing') return;
    let last = performance.now();
    let spawnIn = 400;
    let elapsed = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      spawnIn -= dt * 1000;
      if (spawnIn <= 0) { spawn(); spawnIn = Math.max(380, 1000 - elapsed * 22) * (0.6 + Math.random() * 0.6); }
      const w = arena.current?.clientWidth ?? 0;
      targets.current = targets.current.filter(t => {
        t.t += dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        const bob = t.kind === 'drone' ? Math.sin(t.t * 3 + t.wobble) * 8 : 0;
        t.el.style.transform = `translate3d(${t.x}px,${t.y + bob}px,0)`;
        const gone = t.x < -120 || t.x > w + 120 || t.y < -60;
        if (gone) t.el.remove();
        return !gone;
      });
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    const clock = window.setInterval(() => setTime(s => s - 1), 1000);
    return () => { cancelAnimationFrame(frame.current); window.clearInterval(clock); };
  }, [state, spawn]);

  useEffect(() => {
    if (state === 'playing' && time <= 0) {
      setState('over');
      clearTargets();
      setBest(b => { const n = Math.max(b, score); try { localStorage.setItem('eu-drill-best', String(n)); } catch { /* storage unavailable */ } return n; });
    }
  }, [time, state, score]);

  useEffect(() => () => { cancelAnimationFrame(frame.current); clearTargets(); }, []);

  const start = () => { clearTargets(); setScore(0); setShots(0); setHits(0); setCombo(0); setTime(DURATION); setState('playing'); };
  const miss = () => { if (state === 'playing') { setShots(v => v + 1); setCombo(0); comboRef.current = 0; } };
  const accuracy = shots ? Math.round((hits / shots) * 100) : 0;

  return <section className="chapter night drill-section" aria-labelledby="drill-title">
    <div className="contours" aria-hidden="true"/>
    <div className="chapter-head" data-reveal="rule"><span className="label">Field drill</span><span className="label">30 seconds · Targets inbound</span></div>
    <div className="drill-top">
      <div><h2 id="drill-title" className="display-xl">Sharpen<br/>your aim.</h2><p>Drones drift, jets streak, rockets climb and launchers roll. Shoot them down before the clock runs out. Fast targets score more, and back-to-back hits build a combo.</p></div>
      <dl className="drill-hud" aria-live="polite">
        <div><dt><Trophy size={14}/> Score</dt><dd>{String(score).padStart(4, '0')}</dd></div>
        <div><dt><Timer size={14}/> Time</dt><dd>{String(Math.max(time, 0)).padStart(2, '0')}s</dd></div>
        <div><dt><Crosshair size={14}/> Accuracy</dt><dd>{accuracy}%</dd></div>
        <div><dt>Best</dt><dd>{String(best).padStart(4, '0')}</dd></div>
      </dl>
    </div>
    <div ref={arena} className={`drill-arena is-${state}`} onPointerDown={miss}>
      <div className="da-grid" aria-hidden="true"/>
      <span className="da-horizon" aria-hidden="true"/>
      {combo > 1 && state === 'playing' && <span className="da-combo" aria-hidden="true">Combo ×{Math.min(combo, 4)}</span>}
      {state !== 'playing' && <div className="da-panel">
        {state === 'idle'
          ? <><p className="label">Briefing</p><h3>Targets inbound.</h3><p>You have {DURATION} seconds. Click or tap a target to take it down.</p><button type="button" className="button button-red" onClick={start}><Crosshair size={18}/> Start drill</button></>
          : <><p className="label">Drill complete</p><h3>{score} points</h3><p>{hits} hits · {accuracy}% accuracy{score >= best && score > 0 ? ' · New best!' : ''}</p><div className="da-actions"><button type="button" className="button button-light" onClick={start}><RotateCcw size={16}/> Go again</button><Link className="button button-red" href="/book-now">Ready for the real thing? <ArrowUpRight size={18}/></Link></div></>}
      </div>}
    </div>
    <p className="drill-note">A website mini-game for fun. Real activities on site, such as archery and air rifle shooting, are supervised and confirmed with the team.</p>
  </section>;
}
