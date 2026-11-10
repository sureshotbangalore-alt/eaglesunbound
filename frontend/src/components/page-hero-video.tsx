'use client';
import { useEffect, useRef, useState } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';
import { usePageLoaded } from '@/lib/page-loaded';

/** Silent real-footage loop behind an inner page header. It starts downloading only after the page has loaded (the
 *  photo underneath is what visitors see first), fades in once it plays, plays only while on screen, and is not used
 *  when motion is paused or reduced. */
export function PageHeroVideo({ src }: { src: string }) {
  const paused = useMotionPaused();
  const loaded = usePageLoaded();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v || paused || !loaded) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.1 });
    observer.observe(v); return () => observer.disconnect();
  }, [paused, loaded]);
  if (paused || !loaded) return null;
  return <video ref={ref} className={`ph-video${playing ? ' is-playing' : ''}`} src={src} muted loop playsInline preload="auto" onPlaying={() => setPlaying(true)} aria-hidden="true" tabIndex={-1} />;
}
