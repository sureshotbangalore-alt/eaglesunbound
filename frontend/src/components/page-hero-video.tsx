'use client';
import { useEffect, useRef } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';

/** Silent real-footage loop behind an inner page header. Plays only while on screen; the photo shows when motion is
 *  paused or reduced. */
export function PageHeroVideo({ src, poster }: { src: string; poster: string }) {
  const paused = useMotionPaused();
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current; if (!v || paused) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.1 });
    observer.observe(v); return () => observer.disconnect();
  }, [paused]);
  if (paused) return null;
  return <video ref={ref} className="ph-video" src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />;
}
