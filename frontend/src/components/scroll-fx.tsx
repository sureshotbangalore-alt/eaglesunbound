'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { animate, scroll } from 'motion';
import { useMotionPaused } from '@/lib/motion-preference';

/*
 * One engine for the public site's scroll choreography. Markup opts in with data attributes:
 *   data-reveal[="lines"|"mask"|"rule"]  reveal once when it enters the viewport
 *   data-stagger                          children reveal one after another
 *   data-parallax="12"                    drifts ±12% through the viewport
 *   data-fill                             words light up while it is read (FillText)
 *   data-expand                           image widens to full bleed while scrolling in
 *   data-progress                         line grows with its parent's scroll progress
 *   data-hscroll                          vertical scroll drives a horizontal track (desktop)
 *   data-hero                             hero copy lifts away as the hero leaves
 *   data-scale-in                         grows from 86% to full size as it arrives
 *   data-preview="/img.jpg"               shows a cursor-following image on hover
 * Hidden "before" states live in motion.css under html.fx, which an inline script sets
 * before first paint unless the visitor prefers reduced motion.
 */

// Inner-page elements that reveal without markup changes. Keep in sync with motion.css.
const AUTO = '.intro-grid>*,.info-columns>*,.team-block>*,.listing-item,.detail-aside,.faq-list details,.form-intro,.form-layout>form,.client-list>div,.gallery-item,.prose>*,.empty-state,.catalogue-tools,.statement,.success-state';

type Cleanup = () => void;

export function ScrollFX() {
  const path = usePathname();
  const paused = useMotionPaused();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = paused;
    root.classList.toggle('fx', !reduced);
    root.classList.add('fx-ready');

    // Header: condense after leaving the top, hide while travelling down, return on the way up.
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        document.querySelector('.cursor-preview.show')?.classList.remove('show');
        root.classList.toggle('is-scrolled', y > 24);
        if (Math.abs(y - lastY) > 6) root.classList.toggle('nav-away', y > lastY && y > 520);
        lastY = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (reduced) return () => window.removeEventListener('scroll', onScroll);

    const cleanups: Cleanup[] = [];
    const linear = { ease: 'linear' as const };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // Also reveal anything already scrolled past (anchor jumps, restored scroll).
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -9% 0px' });

    const bound = new WeakSet<Element>();
    const once = (selector: string, fn: (el: HTMLElement) => void) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (bound.has(el)) return;
        bound.add(el);
        fn(el);
      });
    };

    const bind = () => {
      once(`[data-reveal],[data-stagger],.route-stage :is(${AUTO})`, (el) => {
        if (el.hasAttribute('data-stagger')) [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i)));
        io.observe(el);
      });

      once('[data-parallax]', (el) => {
        if (window.matchMedia('(max-width: 900px)').matches) return;
        const amount = Math.min(Number(el.dataset.parallax) || 5, 6);
        cleanups.push(scroll(animate(el, { y: [`-${amount}%`, `${amount}%`] }, linear), { target: el.parentElement ?? el, offset: ['start end', 'end start'] }));
      });

      once('[data-hero]', (hero) => {
        const copy = hero.querySelector<HTMLElement>('[data-hero-copy]');
        if (copy) cleanups.push(scroll(animate(copy, { y: [0, -30], opacity: [1, 1] }, linear), { target: hero, offset: ['start start', 'end start'] }));
      });

      once('[data-fill]', (el) => {
        const words = [...el.querySelectorAll<HTMLElement>('.fw')];
        let lit = -1;
        cleanups.push(scroll((p: number) => {
          const n = Math.round(p * words.length);
          if (n === lit) return;
          words.forEach((w, i) => w.classList.toggle('on', i < n));
          lit = n;
        }, { target: el, offset: ['start 82%', 'end 52%'] }));
      });

      once('[data-expand]', (el) => {
        cleanups.push(scroll(animate(el, { clipPath: ['inset(0% 9% 0% 9%)', 'inset(0% 0% 0% 0%)'] }, linear), { target: el, offset: ['start end', 'start 20%'] }));
      });

      once('[data-scale-in]', (el) => {
        cleanups.push(scroll(animate(el, { scale: [0.86, 1] }, linear), { target: el, offset: ['start end', 'start 40%'] }));
      });

      once('[data-progress]', (el) => {
        cleanups.push(scroll(animate(el, { scaleY: [0, 1] }, linear), { target: el.parentElement ?? el, offset: ['start 65%', 'end 65%'] }));
      });

      once('[data-hscroll]', (outer) => {
        const track = outer.querySelector<HTMLElement>('[data-hscroll-track]');
        if (!track) return;
        let distance = 0;
        const measure = () => {
          const active = window.innerWidth > 900;
          distance = active ? Math.max(0, track.scrollWidth - track.clientWidth) : 0;
          outer.style.setProperty('--hscroll-height', active ? `${distance + window.innerHeight}px` : 'auto');
          if (!active) track.style.transform = '';
        };
        measure();
        window.addEventListener('resize', measure);
        cleanups.push(() => window.removeEventListener('resize', measure));
        cleanups.push(scroll((p: number) => {
          if (distance) track.style.transform = `translate3d(${-p * distance}px,0,0)`;
          outer.style.setProperty('--hscroll-p', p.toFixed(3));
        }, { target: outer, offset: ['start start', 'end end'] }));
      });
    };

    bind();
    cleanups.push(scroll(animate('.scroll-progress', { scaleX: [0, 1] }, linear)));

    // Late content (streamed sections, filtered lists) joins the choreography as it appears.
    let queued = false;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; bind(); });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    // Pointer-only flourishes: magnetic buttons and the cursor-following preview.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let magnet: HTMLElement | null = null;
    const preview = document.querySelector<HTMLElement>('.cursor-preview');
    const previewImg = preview?.querySelector('img');
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let frame = 0;
    const follow = () => {
      if (!preview || !preview.classList.contains('show')) { frame = 0; return; }
      const dx = target.x - pos.x;
      pos.x += dx * 0.16;
      pos.y += (target.y - pos.y) * 0.16;
      preview.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) rotate(${Math.max(-8, Math.min(8, dx * 0.06))}deg)`;
      frame = requestAnimationFrame(follow);
    };
    const onMove = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      const button = el?.closest<HTMLElement>('.button,.magnetic') ?? null;
      if (magnet && magnet !== button) { magnet.style.removeProperty('--mx'); magnet.style.removeProperty('--my'); }
      magnet = button;
      if (button) {
        const r = button.getBoundingClientRect();
        button.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px`);
        button.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px`);
      }
      const row = el?.closest<HTMLElement>('[data-preview]');
      if (preview && previewImg && row) {
        if (!preview.classList.contains('show')) { pos.x = e.clientX; pos.y = e.clientY; }
        if (previewImg.getAttribute('src') !== row.dataset.preview) previewImg.src = row.dataset.preview!;
        preview.classList.add('show');
        if (!frame) frame = requestAnimationFrame(follow);
      } else if (preview?.classList.contains('show')) {
        preview.classList.remove('show');
      }
      target.x = e.clientX;
      target.y = e.clientY;
    };
    if (fine) document.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      io.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [path, paused]);

  return <>
    <div className="scroll-progress" aria-hidden="true" />
    <div className="cursor-preview" aria-hidden="true"><img alt="" src="/assets/forest-road.jpg" /><span>Illustrative</span></div>
  </>;
}
