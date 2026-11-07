'use client';
import { useEffect, useRef, useState } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';

/** Eagle-flight motion film behind the closing call-to-action. Decorative; loads only when the footer comes near the
 *  screen, and is not shown when motion is paused or reduced. */
export function ClosingFilm() {
  const paused = useMotionPaused();
  const marker = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = marker.current; if (!el || near) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: '400px 0px' });
    observer.observe(el); return () => observer.disconnect();
  }, [near]);
  const base = '/assets/video/motion/eagle-flight';
  if (paused || !near) return <span ref={marker} aria-hidden="true" />;
  return (
    <video className="closing-film" autoPlay muted loop playsInline preload="metadata" poster={`${base}-poster.jpg`} aria-hidden="true" tabIndex={-1}>
      <source src={`${base}-6s.webm`} type="video/webm" />
      <source src={`${base}-6s.mp4`} type="video/mp4" />
    </video>
  );
}
