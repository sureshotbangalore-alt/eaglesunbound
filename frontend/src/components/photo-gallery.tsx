'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { galleryGroups } from '@/lib/imagery';

/** "From the field" gallery: real Eagles Unbound photographs, filterable by group, with an enlarged view. */
export function PhotoGallery() {
  const [group, setGroup] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pictures = galleryGroups[group].pictures;
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);
  const step = (dir: number) => setOpen(i => (i === null ? i : (i + dir + pictures.length) % pictures.length));
  return (
    <section className="field-gallery" aria-labelledby="field-gallery-title">
      <div className="fg-head"><p className="label">From the field</p><h2 id="field-gallery-title" className="display-l">Real days. Real people.</h2><p>Photographed during sessions at Eagles Unbound.</p></div>
      <div className="fg-tabs" role="tablist" aria-label="Photo groups">
        {galleryGroups.map((g, i) => <button key={g.name} type="button" role="tab" aria-selected={group === i} onClick={() => setGroup(i)}>{g.name}<small>{g.pictures.length}</small></button>)}
      </div>
      <ul className="fg-grid" key={group}>
        {pictures.map((p, i) => (
          <li key={p.src} className={i === 0 ? 'is-lead' : ''} style={{ animationDelay: `${i * 0.05}s` }}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Enlarge: ${p.alt}`}>
              <Image src={p.src} alt={p.alt} fill sizes={i === 0 ? '(max-width:800px) 100vw, 50vw' : '(max-width:800px) 50vw, 25vw'} />
              <span className="fg-caption" aria-hidden="true">{p.alt}</span>
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={dialog} className="fg-dialog" onClose={() => setOpen(null)} onKeyDown={e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }} aria-label="Enlarged photograph">
        {open !== null && <>
          <div className="fg-dialog-media"><Image src={pictures[open].src} alt={pictures[open].alt} fill sizes="100vw" /></div>
          <p className="fg-dialog-caption">{pictures[open].alt}<span>{open + 1} / {pictures.length}</span></p>
          <button type="button" className="fg-close" onClick={() => setOpen(null)} aria-label="Close"><X size={20} /></button>
          <button type="button" className="fg-prev" onClick={() => step(-1)} aria-label="Previous photograph"><ChevronLeft size={26} /></button>
          <button type="button" className="fg-next" onClick={() => step(1)} aria-label="Next photograph"><ChevronRight size={26} /></button>
        </>}
      </dialog>
    </section>
  );
}
