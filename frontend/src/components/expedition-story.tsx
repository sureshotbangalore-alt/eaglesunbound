import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import { SplitLines } from './split-text';
import { img, imageLabel } from '@/lib/imagery';

const stages = [['Prepare', 'Meet your group. Listen, look ahead and find your footing.'], ['Challenge', 'Approach an outdoor task with attention and a willingness to try.'], ['Collaborate', 'Share ideas and work towards a common goal.'], ['Reflect', 'Take your shared story and what you learned with you.']];

export function ExpeditionStory() {
  return <section className="chapter night story">
    <div className="contours" aria-hidden="true"/>
    <div className="chapter-head" data-reveal="rule"><span className="label">02 — The bootcamp</span><span className="label">Military-inspired civilian adventure</span></div>
    <div className="story-grid">
      <div className="story-intro">
        <SplitLines text={'A shared challenge.\nA different perspective.'} className="display-xl"/>
        <div data-stagger><p>Approach an unfamiliar task, work through it together and take a fresh perspective back to everyday life.</p><Link href="/the-bootcamp" className="text-link">Explore the bootcamp <ArrowUpRight size={17}/></Link><p className="small">Programme format, suitability and availability are confirmed by the team.</p></div>
        <figure className="story-photo" data-reveal="mask"><div className="media-fill" data-parallax="6"><Image src={img.forestWalk.src} alt={img.forestWalk.alt} fill sizes="(max-width:900px) 100vw, 40vw"/></div><span className="stock-label">{imageLabel(img.forestWalk)}</span></figure>
      </div>
      <div className="story-steps">
        <span className="story-rail" aria-hidden="true"><span data-progress/></span>
        <ol>{stages.map(([title, copy], i) => <li key={title} data-reveal><span className="story-num">0{i + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
      </div>
    </div>
  </section>;
}
