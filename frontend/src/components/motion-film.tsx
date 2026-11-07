'use client';
import { useEffect, useRef } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';

type Props = { name: string; seconds: number; label: string; loop?: boolean; caption?: string };

/** Branded motion-graphics film (rendered by scripts/render-motion.mjs). Plays only while visible; shows the poster when motion is reduced or paused. */
export function MotionFilm({ name, seconds, label, loop = true, caption }: Props) {
  const base = `/assets/video/motion/${name}`;
  const poster = `${base}-poster.jpg`;
  const paused = useMotionPaused();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (paused || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!loop) video.currentTime = 0; void video.play().catch(() => {}); } else video.pause();
    }, { threshold: 0.35 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [paused, loop]);

  return (
    <figure className="motion-film" data-reveal>
      {paused
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={label} width={1280} height={720} loading="lazy" decoding="async" />
        : <video ref={ref} muted loop={loop} playsInline preload="metadata" poster={poster} aria-label={label} width={1280} height={720}>
            <source src={`${base}-${seconds}s.webm`} type="video/webm" />
            <source src={`${base}-${seconds}s.mp4`} type="video/mp4" />
          </video>}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
