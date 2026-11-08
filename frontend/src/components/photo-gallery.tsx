'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { galleryGroups, type MediaItem } from '@/lib/imagery';
import { useMotionPaused } from '@/lib/motion-preference';

const ALL = 'All';
const everything = galleryGroups.flatMap(g => g.items).filter((m, i, a) => a.findIndex(x => x.src === m.src) === i);

/** Tile: photo, or a clip that previews silently on hover/focus (never autoplays a whole grid). */
function Tile({ item, lead, onOpen }: { item: MediaItem; lead: boolean; onOpen: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const paused = useMotionPaused();
  const play = () => { if (!paused) void video.current?.play().catch(() => {}); };
  const stop = () => { const v = video.current; if (v) { v.pause(); v.currentTime = 0; } };
  return (
    <button type="button" className="mg-tile" onClick={onOpen} onPointerEnter={play} onPointerLeave={stop} onFocus={play} onBlur={stop} aria-label={`Open: ${item.alt}`}>
      <Image src={item.src} alt={item.alt} fill sizes={lead ? '(max-width:800px) 100vw, 50vw' : '(max-width:800px) 50vw, 25vw'} />
      {item.video && <><video ref={video} src={item.video} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} /><span className="mg-badge"><Play size={13} fill="currentColor" aria-hidden="true" />Video</span></>}
      <span className="mg-caption" aria-hidden="true">{item.alt.replace(/^Video: /, '')}</span>
    </button>
  );
}

/** Gallery: real Eagles Unbound photographs and clips, masonry layout, filters, full-screen viewer with video playback. */
export function PhotoGallery() {
  const [group, setGroup] = useState(ALL);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const items = group === ALL ? everything : galleryGroups.find(g => g.name === group)!.items;
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);
  const step = (dir: number) => setOpen(i => (i === null ? i : (i + dir + items.length) % items.length));
  const current = open !== null ? items[open] : null;
  return (
    <section className="media-gallery" id="gallery" aria-labelledby="gallery-title">
      <div className="ds-heading"><p className="label">Gallery · From the field</p><h2 id="gallery-title" className="display-l">Real days. Real people.</h2><p>Photographs and clips from sessions at Eagles Unbound.</p></div>
      <div className="mg-filters" role="tablist" aria-label="Gallery groups">
        {[ALL, ...galleryGroups.map(g => g.name)].map(name => {
          const count = name === ALL ? everything.length : galleryGroups.find(g => g.name === name)!.items.length;
          return <button key={name} type="button" role="tab" aria-selected={group === name} onClick={() => { setGroup(name); setOpen(null); }}>{name}<small>{count}</small></button>;
        })}
      </div>
      <ul className="mg-grid" key={group}>
        {items.map((item, i) => (
          <li key={item.src} className={`mg-item${i % 7 === 0 ? ' is-lead' : i % 5 === 3 ? ' is-tall' : ''}`} style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
            <Tile item={item} lead={i % 7 === 0} onOpen={() => setOpen(i)} />
          </li>
        ))}
      </ul>
      <dialog ref={dialog} className="mg-dialog" onClose={() => setOpen(null)} onKeyDown={e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }} aria-label="Gallery viewer">
        {current && <>
          <div className="mg-stage" key={current.src}>
            {current.video
              ? <video src={current.video} poster={current.src} controls autoPlay muted loop playsInline aria-label={current.alt} />
              : <Image src={current.src} alt={current.alt} fill sizes="100vw" />}
          </div>
          <p className="mg-dialog-caption">{current.alt}<span>{(open ?? 0) + 1} / {items.length}</span></p>
          <button type="button" className="mg-close" onClick={() => setOpen(null)} aria-label="Close viewer"><X size={20} /></button>
          <button type="button" className="mg-prev" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={26} /></button>
          <button type="button" className="mg-next" onClick={() => step(1)} aria-label="Next"><ChevronRight size={26} /></button>
        </>}
      </dialog>
    </section>
  );
}
