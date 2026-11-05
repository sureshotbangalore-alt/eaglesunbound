import Image from 'next/image';
import { imageLabel, type Picture } from '@/lib/imagery';

/** Editorial photo compositions for inner pages: one wide frame, an offset pair, or a staggered trio. */
export function ImageBand({ pictures, layout = 'wide', caption }: { pictures: Picture[]; layout?: 'wide' | 'pair' | 'trio'; caption?: string }) {
  const labels = [...new Set(pictures.map(imageLabel))].join(' · ');
  return <div className={`image-band ib-${layout}`}>
    {pictures.map((p, i) => <figure key={p.src} data-reveal="mask"><div className="media-fill" data-parallax={String(6 + i * 4)}><Image src={p.src} alt={p.alt} fill sizes={layout === 'wide' ? '100vw' : '(max-width:900px) 100vw, 50vw'}/></div></figure>)}
    {caption && <p className="ib-caption display-l" data-reveal>{caption}</p>}
    <span className="stock-label">{labels}</span>
  </div>;
}
