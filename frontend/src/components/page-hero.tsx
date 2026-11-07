import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { StructuredData } from './structured-data';
import { SplitLines } from './split-text';
import { FieldAtmosphere, MotionSwitch } from './field-experience';
import { PageHeroHUD } from './page-hero-hud';
import { siteURL } from '@/lib/seo';
import { img, photos, imageLabel, type Picture } from '@/lib/imagery';
import { PageHeroVideo } from './page-hero-video';

type Variant = 'night' | 'photo' | 'paper' | 'minimal';
// Each family of pages gets its own opening composition.
// Full-bleed photograph behind the title:
const photo: Record<string, Picture> = { '/the-bootcamp': img.wall, '/activities': img.rope, '/explore': img.ghats, '/mission-selector': img.trek, '/about': img.granite, '/what-we-offer': img.heroTeam, '/gallery': img.camp, '/kids-experiences': img.kids, '/schools-and-colleges': img.schools, '/corporate': img.cheer, '/accommodation': img.camp, '/founder': img.granite };
// Warm paper with a framed photograph beside the title:
const framed: Record<string, Picture> = { '/contact': img.campfire, '/book-now': img.forestWalk, '/clients': img.students, '/testimonials': img.cheer, '/faqs': img.forest, '/food-and-dining': photos.tentStay, '/packages': img.trek };
const minimal = ['/privacy-policy', '/terms-and-conditions', '/booking-policy', '/cookie-policy'];
// Real-footage loops (scripts/build-hero-film.py --loops) behind these photo headers:
const loops: Record<string, string> = { '/the-bootcamp': 'loop-bootcamp', '/activities': 'loop-activities', '/about': 'loop-about' };
const order = ['/the-bootcamp', '/what-we-offer', '/activities', '/clients', '/about', '/kids-experiences', '/schools-and-colleges', '/gallery', '/contact', '/book-now'];

function variantFor(path: string, picture?: Picture, side?: Picture): Variant {
  if (picture) return 'photo';
  if (side) return 'paper';
  if (photo[path]) return 'photo';
  if (minimal.includes(path)) return 'minimal';
  if (framed[path]) return 'paper';
  return 'night';
}

export function PageHero({ title, intro, label, path, booking, picture, portrait }: { title: string; intro: string; label: string; path: string; booking?: string; picture?: Picture; portrait?: Picture | null }) {
  const variant = variantFor(path, picture, portrait ?? undefined);
  const index = order.indexOf(path);
  const numeral = String(index >= 0 ? index + 1 : (path.length % 9) + 1).padStart(2, '0');
  const bg = picture || (portrait ? undefined : photo[path]);
  const side = portrait || framed[path];
  const remote = bg?.src.startsWith('https://');
  return <section className={`page-hero ph-${variant}${side ? ' ph-framed' : ''}`} data-hero>
    {variant === 'photo' && bg && <><div className="ph-media" data-parallax="10"><Image src={bg.src} alt="" fill priority sizes="100vw" unoptimized={remote}/>{!picture && loops[path] && <PageHeroVideo src={`/assets/video/${loops[path]}.mp4`} poster={bg.src}/>}</div>{!remote && <span className="stock-label">{imageLabel(bg)}</span>}</>}
    {variant === 'night' && <div className="contours" aria-hidden="true"/>}
    {variant !== 'minimal' && <PageHeroHUD photo={variant === 'photo'} />}
    {variant === 'paper' && <span className="ph-numeral" aria-hidden="true">{numeral}</span>}
    {side && <figure className="ph-side" data-reveal="mask"><div className="media-fill" data-parallax="6"><Image src={side.src} alt={side.alt} fill priority sizes="(max-width:900px) 100vw, 38vw"/></div><span className="corner tl" aria-hidden="true"/><span className="corner br" aria-hidden="true"/>{!portrait && <span className="stock-label">{imageLabel(side)}</span>}</figure>}
    {variant !== 'minimal' && <MotionSwitch/>}
    {['/explore','/about','/accommodation','/the-bootcamp'].includes(path) && <FieldAtmosphere/>}
    <div className="ph-inner" data-hero-copy>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{label}</span></nav>
      <p className="label ph-label">Eagles Unbound <span aria-hidden="true">—</span> {label}</p>
      <SplitLines as="h1" text={title.replace(/\. (?=\S)/, '.\n')}/>
      <div className="ph-foot"><p className="lead">{intro}</p>{booking && <Link href={booking} className="button button-red">Plan your experience <ArrowUpRight size={18}/></Link>}</div>
    </div>
    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteURL() }, { '@type': 'ListItem', position: 2, name: label, item: siteURL() + path }] }}/>
  </section>;
}
