import Image from 'next/image';
import { Compass, Users, Flag, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { SplitLines } from './split-text';
import { img, imageLabel, type Picture } from '@/lib/imagery';

const scenes: Record<string, Picture[]> = {
  about: [img.dawn, img.wall, img.granite],
  corporate: [img.wall, img.cheer],
  'kids-experiences': [img.kids, img.forestWalk],
  'schools-and-colleges': [img.schools, img.students],
  accommodation: [img.camp, img.campfire],
};
const onward: Record<string, [string,string]> = {
  corporate:['/programmes/corporate-team-building','Explore team building'],
  'schools-and-colleges':['/programmes/school-day-outing','Explore school programmes'],
  'kids-experiences':['/contact?visitor=School','Plan a children’s experience'],
  accommodation:['/programmes/overnight-stay-program','Explore the overnight programme'],
  about:['/founder','Meet our founder'],
};
export function EditorialPage({section,sections}:{section:string;sections:{heading:string;body:string}[]}) {
 const pictures=scenes[section]||[img.dawn,img.wall];
 const next=onward[section]||['/what-we-offer','Explore programmes'];
 return <div className="editorial-page">
   <nav className="chapter-index" aria-label="On this page"><span>IN THIS CHAPTER</span>{sections.map((s,i)=><a href={`#chapter-${i+1}`} key={i}><small>{String(i+1).padStart(2,'0')}</small>{s.heading}</a>)}</nav>
   <div className="editorial-sections">{sections.map((s,i)=>{const picture=pictures[Math.floor(i/2)%pictures.length];const Icon=[Compass,Users,Flag][i%3];return <section id={`chapter-${i+1}`} key={i} className={`editorial-chapter ${i%2?'ec-reverse':''}`}>
     <div className="ec-copy"><div className="ec-number" aria-hidden="true"><Icon size={24} strokeWidth={1}/><span>CHAPTER / {String(i+1).padStart(2,'0')}</span></div><SplitLines text={s.heading} className="display-l"/>{s.body.split('\n').filter(Boolean).map((text,n)=><p key={n} data-reveal>{text}</p>)}</div>
     {i%2===0?<figure className="ec-image" data-reveal="mask"><div className="media-fill" data-parallax="5"><Image src={picture.src} alt={picture.alt} fill sizes="(max-width:900px) 90vw, 43vw"/></div><span className="corner tl"/><span className="corner br"/><figcaption>{imageLabel(picture)}</figcaption></figure>:<div className="ec-emblem" aria-hidden="true"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="104"/><circle cx="120" cy="120" r="86" strokeDasharray="2 9"/><path d="M120 5V45M120 195V235M5 120H45M195 120H235"/><path d="M120 60L144 120L120 180L96 120Z"/></svg><span>{String(i+1).padStart(2,'0')}</span></div>}
   </section>})}</div>
   <div className="editorial-next" data-reveal><p className="label">THE NEXT STEP</p><h2>Make it your experience.</h2><div><Link className="button button-red" href={next[0]}>{next[1]} <ArrowUpRight size={18}/></Link><Link className="text-link" href="/contact">Talk to our team ↗</Link><Link className="text-link" href="/book-now">Request an experience ↗</Link></div></div>
 </div>;
}
