'use client';
import { useEffect, useRef } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';
import { fireAt, stopAll } from '@/lib/battle-fx';

const INTERACTIVE = 'a, button, [role="button"], summary, label, select, .range-stage';
const NATIVE_CURSOR = 'input, textarea, [contenteditable="true"], select, iframe, video[controls]';

/**
 * Rifle-scope cursor for mouse users, plus a weapon effect on every click (bullet burst, arrow, rocket or bomb).
 * Off when motion is paused (header switch) or the visitor prefers reduced motion; touch screens get the click effects only.
 */
export function BattleFX() {
  const paused = useMotionPaused();
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) { stopAll(); return; }
    const root = document.documentElement;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const el = scope.current;
    let tx = -100, ty = -100, x = -100, y = -100, frame = 0, visible = false;

    const render = () => {
      x += (tx - x) * 0.35; y += (ty - y) * 0.35;
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(render) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !el) return;
      tx = e.clientX; ty = e.clientY;
      if (!visible) { x = tx; y = ty; visible = true; }
      const target = e.target as Element | null;
      const native = !!target?.closest?.(NATIVE_CURSOR);
      el.classList.toggle('is-hidden', native);
      el.classList.toggle('is-locked', !native && !!target?.closest?.(INTERACTIVE));
      if (!frame) frame = requestAnimationFrame(render);
    };
    const leave = () => { el?.classList.add('is-hidden'); visible = false; };
    const enter = () => el?.classList.remove('is-hidden');
    const click = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (e.button !== 0 || target?.closest?.('[data-no-blast], input, textarea, select, [contenteditable="true"]')) return;
      fireAt(e.clientX, e.clientY);
      if (el) { el.classList.remove('is-firing'); void el.offsetWidth; el.classList.add('is-firing'); }
    };

    if (fine) {
      root.classList.add('fx-scope');
      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerleave', leave);
      document.addEventListener('pointerenter', enter);
    }
    window.addEventListener('click', click, { capture: true, passive: true });
    return () => {
      root.classList.remove('fx-scope');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      window.removeEventListener('click', click, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, [paused]);

  if (paused) return null;
  return (
    <div ref={scope} className="scope-cursor is-hidden" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <g className="scope-spin">
          <circle cx="32" cy="32" r="27" className="scope-ring" />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1="32" y1="3" x2="32" y2={i % 3 === 0 ? 9 : 6} className="scope-tick" transform={`rotate(${i * 30} 32 32)`} />)}
        </g>
        <circle cx="32" cy="32" r="14" className="scope-inner" />
        <path d="M32 10v14M32 40v14M10 32h14M40 32h14" className="scope-cross" />
        <circle cx="32" cy="32" r="2.2" className="scope-dot" />
      </svg>
      <span className="scope-label">LOCK</span>
    </div>
  );
}
