'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useMotionPaused } from '@/lib/motion-preference';
import { explosion, fireAt, impact, popupText, type Weapon } from '@/lib/battle-fx';
import { isMuted, play, setMuted, unlockAudio } from '@/lib/range-sound';

/* Eagle Eye Range: an optional, fictional arcade target game. Canvas drawing, no libraries. Nothing is sent anywhere:
   the best score and the mute choice stay in this browser. Mouse, touch and keyboard (arrows + Space) all work. */

type Kind = 'plate' | 'drone' | 'ally' | 'crate';
type Target = { kind: Kind; x: number; y: number; r: number; age: number; life: number; vx: number; down: number; hit: boolean };
type Phase = 'idle' | 'countdown' | 'playing' | 'over';
type Level = 'recruit' | 'regular' | 'elite';
type Result = { score: number; hits: number; shots: number; best: number; rank: string; newBest: boolean; streak: number; level: Level };

const LEVELS: Record<Level, { label: string; note: string; life: number; spawn: number; speed: number; max: number }> = {
  recruit: { label: 'Recruit', note: 'Slower targets, more time to aim', life: 1.35, spawn: 1.2, speed: 0.75, max: 3 },
  regular: { label: 'Regular', note: 'The standard range', life: 1, spawn: 1, speed: 1, max: 4 },
  elite: { label: 'Elite', note: 'Fast drones, short windows', life: 0.72, spawn: 0.75, speed: 1.35, max: 5 },
};
const ROUND = 30, MAG = 8, RELOAD = 0.8, BEST_KEY = 'eu.range-best';
const RANKS: [number, string][] = [[750, 'Eagle Eye'], [500, 'Sharpshooter'], [300, 'Marksman'], [150, 'Cadet'], [0, 'Recruit']];
const REWARDS: Weapon[] = ['rocket', 'arrow', 'bomb'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const bestKey = (level: Level) => `${BEST_KEY}.${level}`;
const readBest = (level: Level) => { try { return Number(localStorage.getItem(bestKey(level))) || 0; } catch { return 0; } };
const saveBest = (level: Level, v: number) => { try { localStorage.setItem(bestKey(level), String(v)); } catch { /* in memory only */ } };
const multiplier = (streak: number) => Math.min(4, 1 + Math.floor(streak / 4));

export function RangeGame() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const motionPaused = useMotionPaused();
  const fxOn = useRef(!motionPaused);
  fxOn.current = !motionPaused;
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('regular');
  const [count, setCount] = useState(3);
  const [muted, setMutedState] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [shownScore, setShownScore] = useState(0);
  const [best, setBest] = useState(0);
  const [announce, setAnnounce] = useState('');
  const g = useRef({
    w: 960, h: 540, dpr: 1, time: 0, left: ROUND, score: 0, hits: 0, shots: 0, streak: 0, bestStreak: 0, ammo: MAG, reloading: 0, spawnIn: 0.5,
    targets: [] as Target[], marks: [] as { x: number; y: number; age: number }[], pops: [] as { x: number; y: number; age: number; text: string; color: string }[],
    frame: 0, last: 0, phase: 'idle' as Phase, level: 'regular' as Level, hills: [] as number[], aimX: 480, aimY: 270, keyAim: false, rewardIndex: 0, keys: new Set<string>(),
  });

  useEffect(() => { setMutedState(isMuted()); setBest(readBest('regular')); }, []);
  useEffect(() => { setBest(readBest(level)); }, [level]);

  /* ---------- drawing ---------- */
  const draw = useCallback(() => {
    const c = canvas.current?.getContext('2d'); const s0 = g.current; if (!c) return;
    const { w, h } = s0; const s = Math.max(0.6, Math.min(1.25, w / 1000));
    c.setTransform(s0.dpr, 0, 0, s0.dpr, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, '#0c1411'); sky.addColorStop(0.6, '#2c3a2c'); sky.addColorStop(1, '#c08a4e');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    const sun = c.createRadialGradient(w * 0.72, h * 0.52, 0, w * 0.72, h * 0.52, h * 0.38); sun.addColorStop(0, 'rgba(255,214,140,.85)'); sun.addColorStop(0.16, 'rgba(255,190,110,.5)'); sun.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = sun; c.fillRect(0, 0, w, h);
    ['#1e2a22', '#141d18'].forEach((shade, i) => {
      c.fillStyle = shade; c.beginPath(); c.moveTo(0, h * 0.62);
      for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, h * (0.5 + i * 0.05) - (s0.hills[(Math.floor(x / 20) + i * 7) % s0.hills.length] || 0) * h * (0.09 - i * 0.03));
      c.lineTo(w, h * 0.62); c.fill();
    });
    const floor = c.createLinearGradient(0, h * 0.6, 0, h); floor.addColorStop(0, '#3b4031'); floor.addColorStop(1, '#22271f');
    c.fillStyle = floor; c.fillRect(0, h * 0.6, w, h * 0.4);
    c.strokeStyle = 'rgba(233,226,212,.12)'; c.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(w / 2 + i * w * 0.06, h * 0.6); c.lineTo(w / 2 + i * w * 0.26, h); c.stroke(); }
    c.font = `600 ${11 * s}px ui-monospace, monospace`; c.fillStyle = 'rgba(233,226,212,.4)'; c.textAlign = 'left';
    ([['100M', 0.63], ['50M', 0.71], ['25M', 0.8]] as [string, number][]).forEach(([t, y]) => { c.fillText(t, 12, h * y); c.fillRect(0, h * y + 4, w, 1); });
    for (const m of s0.marks) { c.globalAlpha = Math.max(0, 1 - m.age / 3); c.fillStyle = '#0d0f0c'; c.beginPath(); c.arc(m.x, m.y, 2.6 * s, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    for (const t of [...s0.targets].sort((a, b) => a.y - b.y)) drawTarget(c, t, s, h);
    c.fillStyle = '#6b6248';
    for (let row = 0; row < 2; row++) for (let x = -30 + row * 30; x < w + 60; x += 60 * s) {
      const y = h - 30 * s + row * 15 * s; c.beginPath(); c.ellipse(x, y, 32 * s, 12 * s, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke();
    }
    c.textAlign = 'center';
    for (const p of s0.pops) { c.globalAlpha = Math.max(0, 1 - p.age / 0.9); c.font = `700 ${22 * s}px "Barlow Condensed", Impact, sans-serif`; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(p.text, p.x, p.y - p.age * 50); c.fillStyle = p.color; c.fillText(p.text, p.x, p.y - p.age * 50); c.globalAlpha = 1; }
    if (s0.phase !== 'playing') return;
    // keyboard / touch reticle (mouse users already have the scope cursor)
    if (s0.keyAim) {
      c.strokeStyle = '#d3312e'; c.lineWidth = 2; c.beginPath(); c.arc(s0.aimX, s0.aimY, 18 * s, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(s0.aimX - 28 * s, s0.aimY); c.lineTo(s0.aimX - 8 * s, s0.aimY); c.moveTo(s0.aimX + 8 * s, s0.aimY); c.lineTo(s0.aimX + 28 * s, s0.aimY);
      c.moveTo(s0.aimX, s0.aimY - 28 * s); c.lineTo(s0.aimX, s0.aimY - 8 * s); c.moveTo(s0.aimX, s0.aimY + 8 * s); c.lineTo(s0.aimX, s0.aimY + 28 * s); c.stroke();
    }
    // HUD
    c.textAlign = 'left'; c.font = `700 ${28 * s}px "Barlow Condensed", Impact, sans-serif`; c.fillStyle = '#f3efe6'; c.fillText(`SCORE ${s0.score}`, 18, 40 * s);
    const mult = multiplier(s0.streak); if (mult > 1) { c.fillStyle = '#ffd36b'; c.fillText(`×${mult} COMBO`, 18, 70 * s); }
    const barW = w * 0.32; c.fillStyle = 'rgba(243,239,230,.15)'; c.fillRect(w / 2 - barW / 2, 18 * s, barW, 8 * s);
    c.fillStyle = s0.left < 6 ? '#d3312e' : '#c2a46e'; c.fillRect(w / 2 - barW / 2, 18 * s, barW * (s0.left / ROUND), 8 * s);
    c.textAlign = 'center'; c.font = `700 ${20 * s}px "Barlow Condensed", Impact, sans-serif`; c.fillStyle = '#f3efe6'; c.fillText(`${Math.ceil(s0.left)}S`, w / 2, 50 * s);
    for (let i = 0; i < MAG; i++) { const x = w - 70 * s - i * 13 * s; c.fillStyle = i < s0.ammo ? '#c2a46e' : 'rgba(243,239,230,.18)'; c.fillRect(x, 16 * s, 7 * s, 22 * s); if (i < s0.ammo) { c.fillStyle = '#8a6d3b'; c.fillRect(x, 16 * s, 7 * s, 6 * s); } }
    c.textAlign = 'right'; c.font = `700 ${18 * s}px "Barlow Condensed", Impact, sans-serif`;
    if (s0.reloading > 0) { c.fillStyle = '#ffd36b'; c.fillText('RELOADING…', w - 70 * s, 62 * s); }
    else if (s0.ammo === 0) { c.fillStyle = '#d3312e'; c.fillText('RELOAD: R / RIGHT-CLICK / BUTTON', w - 70 * s, 62 * s); }
  }, []);

  /* ---------- round lifecycle ---------- */
  const finish = useCallback(() => {
    const s0 = g.current; s0.phase = 'over';
    const previous = readBest(s0.level); const newBest = s0.score > previous; if (newBest) saveBest(s0.level, s0.score);
    const rank = RANKS.find(([min]) => s0.score >= min)?.[1] || 'Recruit';
    const r: Result = { score: s0.score, hits: s0.hits, shots: s0.shots, best: Math.max(previous, s0.score), rank, newBest, streak: s0.bestStreak, level: s0.level };
    setResult(r); setBest(r.best); setPhase('over'); setShownScore(0); play('end');
    setAnnounce(`Round over. Score ${r.score}. Rank ${rank}.`);
  }, []);

  const tick = useCallback((now: number) => {
    const s0 = g.current; const dt = Math.min(0.05, (now - s0.last) / 1000); s0.last = now;
    const s = Math.max(0.6, Math.min(1.25, s0.w / 1000)); const L = LEVELS[s0.level];
    if (s0.phase === 'playing') {
      s0.left -= dt; s0.time += dt;
      if (s0.reloading > 0 && (s0.reloading -= dt) <= 0) { s0.reloading = 0; s0.ammo = MAG; }
      const step = 340 * s * dt;
      if (s0.keys.size) { s0.keyAim = true; if (s0.keys.has('ArrowLeft')) s0.aimX -= step; if (s0.keys.has('ArrowRight')) s0.aimX += step; if (s0.keys.has('ArrowUp')) s0.aimY -= step; if (s0.keys.has('ArrowDown')) s0.aimY += step; s0.aimX = Math.max(0, Math.min(s0.w, s0.aimX)); s0.aimY = Math.max(0, Math.min(s0.h, s0.aimY)); }
      const progress = Math.min(1, s0.time / ROUND);
      s0.spawnIn -= dt;
      if (s0.spawnIn <= 0 && s0.targets.filter(t => !t.hit).length < L.max - 1 + Math.floor(progress * 2.5)) { spawn(s0, s, progress, L); s0.spawnIn = (0.95 - progress * 0.45) * L.spawn; }
      if (s0.left <= 0) { s0.left = 0; finish(); }
    }
    for (const t of s0.targets) { t.age += dt; if (t.kind === 'drone') { t.x += t.vx * dt; t.y += Math.sin(t.age * 3) * 18 * s * dt; } if (t.hit || t.age > t.life) t.down += dt; }
    s0.targets = s0.targets.filter(t => t.down < 0.25 && t.x > -80 && t.x < s0.w + 80);
    for (const m of s0.marks) m.age += dt; s0.marks = s0.marks.filter(m => m.age < 3);
    for (const p of s0.pops) p.age += dt; s0.pops = s0.pops.filter(p => p.age < 0.9);
    draw();
    s0.frame = s0.phase === 'playing' || s0.pops.length || s0.targets.length ? requestAnimationFrame(tick) : 0;
  }, [draw, finish]);
  const run = useCallback(() => { const s0 = g.current; if (!s0.frame) { s0.last = performance.now(); s0.frame = requestAnimationFrame(tick); } }, [tick]);

  useEffect(() => {
    const s0 = g.current; s0.hills = Array.from({ length: 80 }, (_, i) => (Math.sin(i * 0.45) + Math.sin(i * 0.17 + 1) + 2) / 4);
    const el = stage.current, cv = canvas.current; if (!el || !cv) return;
    const size = () => { const r = el.getBoundingClientRect(); s0.dpr = Math.min(window.devicePixelRatio || 1, 2); s0.w = r.width; s0.h = r.height; cv.width = Math.round(r.width * s0.dpr); cv.height = Math.round(r.height * s0.dpr); draw(); };
    size(); const observer = new ResizeObserver(size); observer.observe(el);
    return () => { observer.disconnect(); if (s0.frame) cancelAnimationFrame(s0.frame); s0.frame = 0; };
  }, [draw]);

  // count-up animation for the results screen
  useEffect(() => {
    if (phase !== 'over' || !result) return;
    if (!fxOn.current) { setShownScore(result.score); return; }
    let frame = 0; const startAt = performance.now();
    const step = (now: number) => { const k = Math.min(1, (now - startAt) / 1100); setShownScore(Math.round(result.score * (1 - Math.pow(1 - k, 3)))); if (k < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step); return () => cancelAnimationFrame(frame);
  }, [phase, result]);

  // 3-2-1 countdown, then the round starts
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) { const s0 = g.current; s0.phase = 'playing'; setPhase('playing'); play('start'); setAnnounce('Go. Thirty seconds.'); run(); return; }
    const timer = setTimeout(() => setCount(c => c - 1), 650); return () => clearTimeout(timer);
  }, [phase, count, run]);

  const start = () => {
    unlockAudio(); play('whoosh');
    const s0 = g.current;
    Object.assign(s0, { time: 0, left: ROUND, score: 0, hits: 0, shots: 0, streak: 0, bestStreak: 0, ammo: MAG, reloading: 0, spawnIn: 0.3, targets: [], marks: [], pops: [], phase: 'countdown' as Phase, level, aimX: s0.w / 2, aimY: s0.h / 2, keyAim: false, rewardIndex: 0 });
    s0.keys.clear(); setResult(null); setCount(3); setPhase('countdown'); setAnnounce(`${LEVELS[level].label} round. Starting in 3.`); draw();
    stage.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ block: 'center', behavior: fxOn.current ? 'smooth' : 'auto' });
  };
  const exit = () => { const s0 = g.current; s0.phase = 'idle'; s0.targets = []; s0.pops = []; s0.keys.clear(); setPhase('idle'); setAnnounce('Left the range.'); draw(); };
  const reload = useCallback(() => { const s0 = g.current; if (s0.phase === 'playing' && !s0.reloading && s0.ammo < MAG) { s0.reloading = RELOAD; play('reload'); } }, []);
  const toggleMute = () => { const next = !muted; setMuted(next); setMutedState(next); if (!next) { unlockAudio(); play('hit'); } };

  /* ---------- shooting ---------- */
  const shootAt = (x: number, y: number, touch = false) => {
    const s0 = g.current; if (s0.phase !== 'playing' || s0.reloading) return;
    const rect = canvas.current!.getBoundingClientRect();
    if (s0.ammo === 0) { s0.pops.push({ x, y, age: 0, text: 'RELOAD!', color: '#d3312e' }); play('empty'); return; }
    s0.ammo--; s0.shots++; play('shot');
    stage.current?.classList.remove('is-recoil'); void stage.current?.offsetWidth; stage.current?.classList.add('is-recoil');
    const target = [...s0.targets].reverse().find(t => !t.hit && t.age > 0.08 && Math.hypot(t.x - x, t.y - y) <= t.r * (touch ? 1.4 : 1.1) + (touch ? 8 : 0));  // fingers are less precise than a mouse
    if (!target) {
      s0.streak = 0; s0.marks.push({ x, y, age: 0 });
      if (fxOn.current) impact(rect.left + x, rect.top + y);
    } else award(target, x, y, rect, false);
    if (s0.ammo === 0) setTimeout(reload, 250);
  };

  const award = (t: Target, x: number, y: number, rect: DOMRect, chained: boolean) => {
    const s0 = g.current; t.hit = true;
    const cx = rect.left + t.x, cy = rect.top + t.y;
    if (t.kind === 'ally') { s0.score = Math.max(0, s0.score - 20); s0.streak = 0; s0.pops.push({ x: t.x, y: t.y - t.r, age: 0, text: 'ALLY FLAG −20', color: '#7fd18b' }); play('empty'); return; }
    s0.hits++; s0.streak++; s0.bestStreak = Math.max(s0.bestStreak, s0.streak);
    const d = Math.hypot(t.x - x, t.y - y) / t.r;
    const [base, label] = t.kind === 'drone' ? [25, 'DRONE DOWN'] : t.kind === 'crate' ? [15, 'KABOOM'] : chained ? [6, 'CHAIN'] : d < 0.33 ? [10, 'BULLSEYE'] : d < 0.66 ? [6, ''] : [3, ''];
    const points = base * multiplier(s0.streak); s0.score += points;
    s0.pops.push({ x: t.x, y: t.y - t.r, age: 0, text: `${label ? label + ' ' : ''}+${points}`, color: label === 'BULLSEYE' ? '#ffd36b' : '#f3efe6' });
    if (t.kind === 'crate' || t.kind === 'drone') play('blast'); else play(label === 'BULLSEYE' ? 'bullseye' : 'hit');
    if (fxOn.current) { if (t.kind === 'crate') explosion(cx, cy, 1.25); else if (t.kind === 'drone') explosion(cx, cy, 0.7); else impact(cx, cy); }
    if (t.kind === 'crate') for (const o of s0.targets) if (!o.hit && o.kind !== 'ally' && Math.hypot(o.x - t.x, o.y - t.y) < 170 * Math.max(0.6, s0.w / 1000)) award(o, o.x, o.y, rect, true);
    // every 5 hits in a row: a reward strike (rocket, arrow or bomb) on another live target
    if (!chained && s0.streak % 5 === 0) {
      const next = s0.targets.find(o => !o.hit && o.kind !== 'ally');
      const weapon = REWARDS[s0.rewardIndex++ % REWARDS.length];
      if (fxOn.current) popupText(cx, cy - 40, `${weapon.toUpperCase()} STRIKE!`);
      if (next) {
        next.hit = true; // reserved for the strike
        const strike = () => { next.hit = false; if (s0.phase === 'playing') award(next, next.x, next.y, rect, true); };
        if (fxOn.current) { play('whoosh'); fireAt(rect.left + next.x, rect.top + next.y, weapon); setTimeout(strike, weapon === 'arrow' ? 330 : weapon === 'rocket' ? 520 : 640); }
        else strike();
      }
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const s0 = g.current; s0.aimX = x; s0.aimY = y; s0.keyAim = e.pointerType !== 'mouse';
    shootAt(x, y, e.pointerType === 'touch');
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse') return; const s0 = g.current; const rect = e.currentTarget.getBoundingClientRect(); s0.aimX = e.clientX - rect.left; s0.aimY = e.clientY - rect.top; s0.keyAim = false;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const s0 = g.current; if (s0.phase !== 'playing') return;
    if (e.key.startsWith('Arrow')) { e.preventDefault(); s0.keys.add(e.key); }
    else if (e.key === ' ' || e.key === 'Enter') { if ((e.target as Element) !== stage.current) return; e.preventDefault(); s0.keyAim = true; shootAt(s0.aimX, s0.aimY); }
    else if (e.key === 'r' || e.key === 'R') reload();
    else if (e.key === 'Escape') exit();
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => { g.current.keys.delete(e.key); };

  const accuracy = result && result.shots ? Math.round((result.hits / result.shots) * 100) : 0;

  return (
    <div className="range-game">
      <div ref={stage} className={`range-stage is-${phase}`} data-no-blast tabIndex={0} onKeyDown={onKeyDown} onKeyUp={onKeyUp}
        aria-label="Eagle Eye Range game area. During a round: arrow keys aim, Space fires, R reloads, Escape exits.">
        <canvas ref={canvas} className="range-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onContextMenu={e => { e.preventDefault(); reload(); }} aria-hidden="true" />
        <div className="range-scope-mask" aria-hidden="true" />
        <div className="range-toolbar">
          <button type="button" className="range-icon" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          {(phase === 'playing' || phase === 'countdown') && <button type="button" className="range-icon" onClick={exit} aria-label="Exit the round"><X size={18} /></button>}
        </div>
        {phase === 'idle' && (
          <div className="range-overlay">
            <p className="label">Shooting Academy · Arcade range</p>
            <h3 className="range-title">Eagle Eye Range</h3>
            <ul className="range-rules">
              <li><b>Targets</b> pop up. Centre hits score the most.</li>
              <li><b>Drones</b> fly past for 25 points.</li>
              <li><b>Crates</b> go boom and take out everything nearby.</li>
              <li><b>Green ally flags</b> cost you 20. Leave them standing.</li>
              <li><b>5 hits in a row</b> calls in a reward strike.</li>
            </ul>
            <fieldset className="range-levels"><legend className="label">Difficulty</legend>
              {(Object.keys(LEVELS) as Level[]).map(id => (
                <label key={id} className={level === id ? 'is-on' : ''}><input type="radio" name="range-level" value={id} checked={level === id} onChange={() => setLevel(id)} /><span>{LEVELS[id].label}</span><small>{LEVELS[id].note}</small></label>
              ))}
            </fieldset>
            <button type="button" className="button button-red range-start" onClick={start}>Start 30-second round</button>
            <p className="range-help">Mouse or tap to fire · Keyboard: arrows aim, Space fires · R reloads · Esc exits{best > 0 ? ` · Your best (${LEVELS[level].label}): ${best}` : ''}</p>
          </div>
        )}
        {phase === 'countdown' && <div className="range-count" aria-hidden="true"><span key={count}>{count || 'GO'}</span></div>}
        {phase === 'over' && result && (
          <div className="range-overlay range-results">
            <p className="label">Round complete · {LEVELS[result.level].label}</p>
            <h3 className="range-rank">{result.rank}</h3>
            <dl className="range-stats">
              <div><dt>Score</dt><dd>{shownScore}</dd></div>
              <div><dt>Accuracy</dt><dd>{accuracy}%</dd></div>
              <div><dt>Best streak</dt><dd>{result.streak}</dd></div>
              <div><dt>Best</dt><dd>{result.best}{result.newBest && <span className="range-new">New</span>}</dd></div>
            </dl>
            <div className="range-actions">
              <button type="button" className="button button-red range-start" onClick={start}>Play again</button>
              <button type="button" className="button range-ghost" onClick={exit}>Change difficulty</button>
              <Link className="text-link" href="/book-now">Book a real adventure day ↗</Link>
            </div>
          </div>
        )}
        {phase === 'playing' && <button type="button" className="range-reload" onClick={reload}>Reload</button>}
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  );
}

function spawn(s0: { w: number; h: number; targets: Target[]; time: number }, s: number, progress: number, L: { life: number; speed: number }) {
  const roll = Math.random(); const early = s0.time < 3;
  const kind: Kind = early ? 'plate' : roll < 0.58 ? 'plate' : roll < 0.76 ? 'drone' : roll < 0.9 ? 'ally' : 'crate';
  const depth = Math.random(); const y = s0.h * (0.36 + depth * 0.34); const r = (20 + depth * 22) * s;
  const life = Math.max(0.9, (rand(1.7, 2.5) - progress * 0.8) * L.life);
  if (kind === 'drone') {
    const fromLeft = Math.random() < 0.5;
    s0.targets.push({ kind, x: fromLeft ? -40 : s0.w + 40, y: s0.h * rand(0.16, 0.32), r: 22 * s, age: 0, life: 99, vx: (fromLeft ? 1 : -1) * rand(150, 230) * s * (1 + progress * 0.6) * L.speed, down: 0, hit: false });
    return;
  }
  let x = rand(s0.w * 0.1, s0.w * 0.9);
  for (let i = 0; i < 6 && s0.targets.some(t => Math.hypot(t.x - x, t.y - y) < r + t.r + 12); i++) x = rand(s0.w * 0.1, s0.w * 0.9);
  s0.targets.push({ kind, x, y, r: kind === 'crate' ? r * 0.9 : r, age: 0, life, vx: 0, down: 0, hit: false });
}

function drawTarget(c: CanvasRenderingContext2D, t: Target, s: number, h: number) {
  const up = Math.min(1, t.age / 0.16); const fall = Math.min(1, t.down / 0.25); const k = up * (1 - fall);
  if (k <= 0) return;
  c.save(); c.translate(t.x, t.y);
  if (t.kind === 'drone') {
    c.globalAlpha = 1 - fall; c.rotate(Math.sin(t.age * 3) * 0.12 + fall * 1.2);
    c.fillStyle = '#2b3530'; c.fillRect(-t.r, -4 * s, t.r * 2, 8 * s);
    c.fillStyle = '#d3312e'; c.beginPath(); c.arc(0, 0, 8 * s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(233,226,212,.85)'; c.lineWidth = 2;
    for (const side of [-1, 1]) { const w = Math.abs(Math.cos(t.age * 40)) * 14 * s + 3; c.beginPath(); c.moveTo(side * t.r - w, -8 * s); c.lineTo(side * t.r + w, -8 * s); c.stroke(); }
    c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(0, 4 * s, 2.5 * s, 0, Math.PI * 2); c.fill();
    c.restore(); return;
  }
  c.strokeStyle = '#2a2a22'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(0, t.r * k); c.lineTo(0, Math.min(h * 0.86, t.y + t.r * 2.2) - t.y); c.stroke();
  c.scale(1, k);
  if (t.kind === 'crate') {
    const r = t.r; c.fillStyle = '#9c5a22'; c.fillRect(-r, -r, r * 2, r * 2); c.strokeStyle = '#4a2a12'; c.lineWidth = 3; c.strokeRect(-r, -r, r * 2, r * 2);
    c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.globalAlpha = 0.3; c.stroke(); c.globalAlpha = 1;
    c.fillStyle = '#ffd36b'; c.font = `700 ${r * 0.72}px "Barlow Condensed", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BOOM', 0, 2);
  } else if (t.kind === 'ally') {
    // a green flag on its post: leave it standing
    const r = t.r; c.fillStyle = '#e9e2d4'; c.fillRect(-2, -r * 1.1, 4, r * 2.1);
    c.fillStyle = '#3f8a4f'; c.beginPath(); c.moveTo(2, -r * 1.1); c.quadraticCurveTo(r * 0.7, -r * 1.25 + Math.sin(t.age * 6) * 4, r * 1.3, -r * 0.95); c.lineTo(r * 1.3, -r * 0.15); c.quadraticCurveTo(r * 0.7, -r * 0.05 + Math.sin(t.age * 6 + 1) * 4, 2, -r * 0.25); c.closePath(); c.fill();
    c.fillStyle = '#e9e2d4'; c.font = `700 ${r * 0.42}px "Barlow Condensed", Impact, sans-serif`; c.textAlign = 'center'; c.fillText('ALLY', r * 0.66, -r * 0.52);
  } else {
    for (const [ratio, color] of [[1, '#f3efe6'], [0.8, '#111619'], [0.62, '#f3efe6'], [0.45, '#d3312e'], [0.28, '#f3efe6'], [0.14, '#d3312e']] as [number, string][]) { c.fillStyle = color; c.beginPath(); c.arc(0, 0, t.r * ratio, 0, Math.PI * 2); c.fill(); }
    if (t.age < t.life) { const left = 1 - t.age / t.life; c.strokeStyle = left < 0.3 ? '#d3312e' : '#c2a46e'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, t.r + 5, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.stroke(); }
  }
  c.restore();
}
