import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import { serverAPI, type HomeContent, type ContentRecord } from '@/lib/api';
import { homeSections } from '@/lib/home-sections';
import { ProgrammeSwitcher } from '@/components/programme-switcher';
import { ActivityShowcase } from '@/components/activity-showcase';
import { PortraitFrame } from '@/components/tactical';
import { ConsentVideo } from '@/components/consent-video';
import { FieldAtmosphere, FieldBriefing, MotionSwitch } from '@/components/field-experience';
import { HeroMedia } from '@/components/hero-media';
import { SplitLines, FillText } from '@/components/split-text';
import { pageMetadata } from '@/lib/seo';
import { img, imageLabel, photos } from '@/lib/imagery';
import { founderPortrait } from '@/lib/founder';
import { ValuesTicker } from '@/components/values-ticker';
import { Testimonials, type Testimonial } from '@/components/feedback';
import { MotionFilm } from '@/components/motion-film';
export async function generateMetadata() { return pageMetadata('/', 'Adventure with Purpose in Bengaluru', 'Explore military-inspired civilian challenges, corporate team experiences and student adventure programmes at Eagles Unbound, Bengaluru.'); }


export default async function Home() {
  const [content, programmes, activities, clients] = await Promise.all([serverAPI<HomeContent>('/public/home'), serverAPI<ContentRecord[]>('/public/programmes'), serverAPI<ContentRecord[]>('/public/activities'), serverAPI<ContentRecord[]>('/public/clients')]);
  const testimonials = await serverAPI<Testimonial[]>('/public/testimonials').catch(() => [] as Testimonial[]);
  const portrait = founderPortrait();
  const blocks: Record<string, React.ReactNode> = {
  experience: (<section id="experience" className="chapter paper">
      <div className="chapter-head" data-reveal="rule"><span className="label">01 — The experience</span><span className="label">Go further. Together.</span></div>
      <div className="exp-grid">
        <SplitLines text={content.experience_title.replace('. ', '.\n')} className="display-xl"/>
        <div className="exp-copy"><FillText text={content.experience_description}/><Link href="/about" className="text-link dark-link" data-reveal>Discover our story <ArrowUpRight size={18}/></Link></div>
      </div>
      <figure className="exp-image" data-expand>
        <div className="media-fill" data-parallax="8"><Image src={photos.obstacleNet.src} alt={photos.obstacleNet.alt} fill sizes="100vw"/></div>
        <figcaption><span className="display-l" data-reveal>Less routine.<br/><em>More real.</em></span><span data-reveal>Step outside.<br/>See what you’re made of.</span></figcaption>
        <span className="stock-label">At Eagles Unbound</span>
      </figure>
      <div className="planner" data-reveal><p>Find the right day for your group.</p><Link className="text-link dark-link" href="/what-we-offer">Explore programmes <ArrowUpRight size={17}/></Link></div>
    </section>),
  briefing: (<FieldBriefing/>),
  programmes: (<section className="chapter paper programmes-section">
      <div className="chapter-head" data-reveal="rule"><span className="label">03 — Find your experience</span><span className="label">Different teams. Shared spirit.</span></div>
      <div className="chapter-title"><SplitLines text={'Your people.\nYour adventure.'} className="display-xl"/><Link href="/what-we-offer" className="text-link dark-link" data-reveal>Explore all programmes <ArrowUpRight size={18}/></Link></div>
      <div data-reveal><ProgrammeSwitcher programmes={programmes}/></div>
    </section>),
  activities: (<section className="chapter night activities-section">
      <div className="chapter-head" data-reveal="rule"><span className="label">04 — Out of your comfort zone</span><span className="label">Into the experience</span></div>
      <div className="chapter-title"><SplitLines text={'A little nerve.\nA lot of alive.'} className="display-xl"/><p data-reveal>From the first obstacle to the last shared laugh, find the activities that bring your group together.</p></div>
      <div className="reel-frame" data-reveal><MotionFilm name="activity-reel" seconds={18} label="Eagles Unbound activities film: zip line, wall climb, archery, high ropes, obstacle net, air rifle, rappelling and campfire"/></div>
      <ActivityShowcase activities={activities}/>
      <Link href="/activities" className="text-link" data-reveal>Discover the activity library <ArrowUpRight size={18}/></Link>
    </section>),
  academy: (<section className="chapter night academy-home">
      <div className="chapter-head" data-reveal="rule"><span className="label">Shooting Academy</span><span className="label">Arcade range challenge</span></div>
      <div className="academy-teaser">
        <MotionFilm name="academy-intro" seconds={8} label="Animated scope sweeping a firing range and scoring three bullseyes"/>
        <div>
          <SplitLines text={'Steady hands.\nSharp eyes.'} className="display-xl"/>
          <p className="lead" data-reveal>Thirty seconds, three difficulty levels and a scope that never lies. Take on Eagle Eye Range and see if you earn the top rank.</p>
          <Link href="/shooting-academy" className="button button-red" data-reveal>Enter the range <ArrowUpRight size={17}/></Link>
        </div>
      </div>
    </section>),
  testimonials: (<section className="chapter paper voices">
      <div className="chapter-head" data-reveal="rule"><span className="label">Visitor voices</span><Link className="label" href="/feedback">All feedback ↗</Link></div>
      {testimonials.length > 0
        ? <><SplitLines text={'In their\nwords.'} className="display-xl"/><Testimonials items={testimonials} compact/><Link href="/feedback#share" className="text-link dark-link" data-reveal>Share your experience <ArrowUpRight size={17}/></Link></>
        : <div className="voices-invite" data-reveal><p className="display-l">Visited us recently?</p><p>Tell us about your day. Your feedback helps us improve every programme.</p><Link href="/feedback#share" className="button button-red">Share your experience <ArrowUpRight size={17}/></Link></div>}
    </section>),
  founder: (<section className="chapter bone founder">
      <div className="founder-grid">
        {portrait
          ? <PortraitFrame src={portrait.src} alt={portrait.alt} name="Maj Gen V. P. S. Bhakuni, VSM (Retd.)" tagTop="ID · Founder & CEO" tagSide="37 years of service" stamp="VSM"/>
          : <figure className="founder-media" data-reveal="mask"><div className="media-fill" data-parallax="7"><Image src={img.granite.src} alt={img.granite.alt} fill sizes="(max-width:900px) 100vw, 45vw"/></div><figcaption className="label">Kanakapura Road · Bengaluru</figcaption><span className="stock-label">{imageLabel(img.granite)}</span></figure>}
        <div className="founder-copy"><p className="label" data-reveal>The people behind the experience</p><SplitLines text={'Leadership.\nWith purpose.'} className="display-xl"/>
        <div className="founder-card" data-stagger>
          <p className="label">Founder &amp; CEO</p>
          <h3>Maj Gen V. P. S. Bhakuni, VSM (Retd.)</h3>
          <span className="rule" aria-hidden="true"/>
          <p>Meet the leadership behind Eagles Unbound and explore the focus on adventure, teamwork, discipline and outdoor learning.</p>
          <Link href="/founder" className="text-link dark-link">Meet our founder <ArrowUpRight size={17}/></Link>
        </div></div>
      </div>
    </section>),
  film: (<section className="chapter night film">
      <div className="chapter-head" data-reveal="rule"><span className="label">05 — From the field</span><span className="label">The outdoor spirit</span></div>
      <SplitLines text={'Don’t just watch.\nExperience it.'} className="display-xl"/>
      <div className="film-frame" data-scale-in>
        {content.hero_video ? <ConsentVideo src={content.hero_video} label="Eagles Unbound experience film"/> : <>
          <div className="media-fill" data-parallax="10"><Image src={photos.rappel.src} alt={photos.rappel.alt} fill sizes="(max-width:700px) 100vw, 88vw"/></div>
          <div className="film-note"><p>The terrain. The challenge. The people beside you. Discover the world of Eagles Unbound.</p><Link href="/activities" className="button button-light">Explore the activities <ArrowUpRight size={17}/></Link></div>
          <span className="stock-label">At Eagles Unbound</span></>}
        <span className="corner tl" aria-hidden="true"/><span className="corner tr" aria-hidden="true"/><span className="corner bl" aria-hidden="true"/><span className="corner br" aria-hidden="true"/>
      </div>
    </section>),
  why: (<section className="chapter paper why">
      <div className="chapter-head" data-reveal="rule"><span className="label">06 — More than a day out</span><span className="label">The reason we go outside</span></div>
      <div className="exp-grid">
        <SplitLines text={'The outdoors\nbrings it out.'} className="display-xl"/>
        <div data-stagger><p className="lead">New challenges. Shared decisions. A different side of the people you know.</p><p>Our focus is on outdoor experiences that make space for teamwork, experiential learning and personal discovery. Tell us about your group; we’ll help you explore the right programme.</p><Link href="/contact" className="text-link dark-link">Let’s plan something together <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="why-collage">
        {([[img.cheer, 6], [img.students, 14], [img.trek, 9]] as const).map(([pic, depth], i) => <figure key={pic.src} className={`wc-${i + 1}`} data-reveal="mask"><div className="media-fill" data-parallax={String(depth)}><Image src={pic.src} alt={pic.alt} fill sizes="(max-width:900px) 90vw, 40vw"/></div></figure>)}
        <span className="stock-label">At Eagles Unbound</span>
      </div>
      <ol className="principles-row" data-stagger>{['Purposeful challenges', 'Shared experiences', 'Learning by doing'].map((p, i) => <li key={p}><span>0{i + 1}</span>{p}</li>)}</ol>
    </section>),
  clients: clients.length > 0 ? <section className="chapter bone clients-strip">
      <div className="chapter-head" data-reveal="rule"><span className="label">Shared experiences / Our clients</span><Link className="label" href="/about">About our experiences ↗</Link></div>
      <div className="client-list">{clients.slice(0, 6).map(c => <div key={c.id}>{c.image && <img src={c.image} alt={`${c.name} logo`} loading="lazy"/>}<h2>{c.name}</h2></div>)}</div>
    </section> : null,
  };
  const order = homeSections(content.sections);
  return <main id="main" className="home">
    <section className="home-hero" data-hero>
      <div className="hh-media" data-parallax="9"><HeroMedia video={content.hero_video}/></div>
      <FieldAtmosphere/><div className="hh-shade"/><MotionSwitch/>
      <div className="hh-frame" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="hh-top"><p className="label"><span className="live-dot"/>{content.eyebrow}</p><p className="label hh-est">FIELD EDITION / KARNATAKA, INDIA</p></div>
      <div className="hh-copy" data-hero-copy>
        <p className="label hh-kicker">MILITARY SPIRIT. SOUTH INDIAN SOUL.</p>
        <SplitLines as="h1" text={content.hero_title || 'LEAVE ORDINARY.\nENTER THE FIELD.'} className="hh-title"/>
        <div className="hh-sub">
          <p className="hh-secondary">Courage is better together.</p>
          <div><p className="hh-description">{content.hero_subtitle}</p>
            <div className="hh-actions"><Link href="/book-now" className="button button-red">Book your adventure <ArrowUpRight size={18}/></Link><a href="#experience" className="button button-glass">Explore the experience <ArrowDown size={16}/></a></div></div>
        </div>
      </div>
      <div className="hh-bottom"><a href="#experience" className="hh-cue"><span className="hh-cue-line" aria-hidden="true"/>Scroll to go beyond</a><span className="label"><MapPin size={14}/> Kanakapura Road, Bengaluru</span></div>
      <span className="stock-label">Filmed at Eagles Unbound</span>
    </section>

    <ValuesTicker/>

    {order.map(id => <Fragment key={id}>{blocks[id]}</Fragment>)}
  </main>;
}
