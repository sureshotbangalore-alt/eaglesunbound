'use client';
import { useEffect, useRef, useState } from 'react';
import { useMotionPaused } from '@/lib/motion-preference';

type Props = { name: string; seconds: number; label: string; loop?: boolean; caption?: string };

/** Film in /assets/video/motion (rendered by scripts/render-motion.mjs or built from footage). Nothing is downloaded until
 *  the film is close to the screen: first only the poster (lazy image), then the video, which plays while visible. Shows
 *  the poster when motion is reduced or paused. */
export function MotionFilm({ name, seconds, label, loop = true, caption }: Props) {
  const base = `/assets/video/motion/${name}`;
  const poster = `${base}-poster.jpg`;
  const paused = useMotionPaused();
  const figure = useRef<HTMLElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  // mount the <video> only when the film is within ~half a screen of the viewport
  useEffect(() => {
    const el = figure.current; if (!el || near) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: '50% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    const video = ref.current;
    if (paused || !near || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!loop) video.currentTime = 0; void video.play().catch(() => {}); } else video.pause();
    }, { threshold: 0.35 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [paused, loop, near]);

  return (
    <figure ref={figure} className="motion-film" data-reveal>
      {paused || !near
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={label} width={1280} height={720} loading="lazy" decoding="async" />
        : <video ref={ref} muted loop={loop} playsInline preload="auto" poster={poster} aria-label={label} width={1280} height={720}>
            <source src={`${base}-${seconds}s.webm`} type="video/webm" />
            <source src={`${base}-${seconds}s.mp4`} type="video/mp4" />
          </video>}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
