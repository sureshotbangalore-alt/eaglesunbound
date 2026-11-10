'use client';
import { useMotionPaused } from '@/lib/motion-preference';

/** Background film for the Shooting Academy hero; the poster still is shown when motion is paused or reduced. */
export function AcademyHeroFilm() {
  const paused = useMotionPaused();
  const base = '/assets/video/motion/academy-intro';
  // eslint-disable-next-line @next/next/no-img-element
  if (paused) return <img src={`${base}-poster.jpg`} alt="" width={1280} height={720} />;
  return (
    <video autoPlay muted loop playsInline preload="auto" poster={`${base}-poster.jpg`} aria-label="Animated scope sweeping a firing range and scoring three bullseyes" width={1280} height={720}>
      <source src={`${base}-8s.webm`} type="video/webm" />
      <source src={`${base}-8s.mp4`} type="video/mp4" />
    </video>
  );
}
