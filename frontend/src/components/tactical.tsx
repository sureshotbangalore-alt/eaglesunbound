'use client';
import { useEffect, useRef } from 'react';

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
