import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SplitLines } from './split-text';
import { StructuredData } from './structured-data';
import { PortraitFrame } from './tactical';
import { img, imageLabel } from '@/lib/imagery';
import { founderPortrait } from '@/lib/founder';
import { siteURL } from '@/lib/seo';

// Facts below are taken only from the published sources listed at the end of the page.
const record = [
  ['1981', 'Commissioned', 'Commissioned into the Dogra Regiment of the Indian Army.'],
  ['Field service', 'Counter-insurgency operations', 'Op Pawan with the IPKF in Sri Lanka, and Op Rakshak and Op Parakram in Jammu & Kashmir.'],
  ['2016', 'Commandant, Selection Centre South', 'Took charge in January 2016 of the Bengaluru centre that selects officers for the Army, Navy and Air Force.'],
  ['2018', 'Retired after 37 years', 'Retired on 30 June 2018 in Bengaluru after 37 years of service.'],
  ['Today', 'Founder & CEO, Eagles Unbound', 'Leads a venture in personality and skill development and outbound training, infused with adventure.'],
];
const facts = [['37', 'Years of service'], ['1981', 'Commissioned · Dogra Regiment'], ['VSM', 'Vishisht Seva Medal'], ['2016–18', 'Commandant · Selection Centre South']];
const sources = [
  ['Ministry of Defence spokesperson, 30 June 2018', 'https://x.com/spokespersonmod/status/1013061070146027521'],
  ['Dayananda Sagar Business Academy, talk on 21 September 2020', 'https://dsba.edu.in/newseventsdetail.php?year=2020&id=471&desc=Nation+Building+by+Creating+Awareness+and+Learning+from+Ethos+and+Traditions+of+Armed+Forces'],
  ['Maj Gen VPS Bhakuni on X', 'https://x.com/majgenbhakuni'],
];

export function FounderProfile() {
  const portrait = founderPortrait();
  const pic = portrait || img.granite;
  return <>
    <section className="founder-intro content-section">
      {portrait
        ? <PortraitFrame src={portrait.src} alt={portrait.alt} name="Maj Gen V. P. S. Bhakuni, VSM (Retd.)" tagTop="ID · Founder & CEO" tagSide="Dogra Regt · Commissioned 1981" stamp="VSM"/>
        : <figure className="fi-media" data-reveal="mask">
          <div className="media-fill" data-parallax="5"><Image src={pic.src} alt={pic.alt} fill sizes="(max-width:900px) 100vw, 42vw" priority/></div>
          <span className="corner tl" aria-hidden="true"/><span className="corner br" aria-hidden="true"/>
          <figcaption><span className="label">Founder &amp; CEO</span><strong>Maj Gen V. P. S. Bhakuni, VSM (Retd.)</strong></figcaption>
          <span className="stock-label">{imageLabel(img.granite)}</span>
        </figure>}
      <div className="fi-copy">
        <p className="label">From soldier to General</p>
        <SplitLines text={'Thirty-seven years\nin uniform.'} className="display-xl"/>
        <div data-stagger>
          <p className="lead">Maj Gen V. P. S. Bhakuni was commissioned into the Dogra Regiment in 1981 and served the Indian Army for 37 years, retiring as Commandant of Selection Centre South in Bengaluru.</p>
          <p>Through his service he took part in counter-insurgency operations including Op Pawan in Sri Lanka and Op Rakshak and Op Parakram in Jammu &amp; Kashmir. At Selection Centre South he led the centre that selects officers for the Army, Navy and Air Force.</p>
          <p>Today he brings that experience to Eagles Unbound, a venture in personality and skill development and outbound training, infused with adventure. He also speaks to students about careers in the armed forces and the officer selection process.</p>
        </div>
      </div>
    </section>

    <section className="founder-facts" aria-label="Key facts">
      {facts.map(([n, l], i) => <div key={l} data-reveal style={{ '--d': `${i * 0.08}s` } as React.CSSProperties}><strong>{n}</strong><span>{l}</span></div>)}
    </section>

    <section className="dossier chapter night">
      <div className="contours" aria-hidden="true"/>
      <div className="chapter-head" data-reveal="rule"><span className="label">Service record</span><span className="label">Compiled from published sources</span></div>
      <div className="dossier-grid">
        <div className="dossier-intro">
          <SplitLines text={'A career built\non leadership.'} className="display-xl"/>
          <span className="dossier-stamp" aria-hidden="true">VSM · Retd.</span>
        </div>
        <div className="dossier-list">
          <span className="story-rail" aria-hidden="true"><span data-progress/></span>
          <ol>{record.map(([when, title, copy]) => <li key={title} data-reveal><span className="dl-when">{when}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </div>
      </div>
    </section>

    <section className="founder-quote content-section">
      <blockquote data-reveal><p>“Live a life less ordinary.”</p><footer>Maj Gen V. P. S. Bhakuni, closing a talk to students on lessons from the armed forces</footer></blockquote>
      <div className="fq-actions" data-stagger><Link className="button button-red" href="/the-bootcamp">Explore the bootcamp <ArrowUpRight size={18}/></Link><Link className="text-link dark-link" href="/contact">Talk to the team <ArrowUpRight size={16}/></Link></div>
    </section>

    <section className="content-section founder-sources">
      <p className="label">Sources</p>
      <ul>{sources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label} ↗</a></li>)}</ul>
    </section>

    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'Person', name: 'V. P. S. Bhakuni', honorificPrefix: 'Maj Gen', honorificSuffix: 'VSM (Retd.)', jobTitle: 'Founder and CEO', worksFor: { '@type': 'Organization', name: 'Eagles Unbound', url: siteURL() }, award: 'Vishisht Seva Medal', description: 'Retired Indian Army Major General commissioned into the Dogra Regiment in 1981; former Commandant, Selection Centre South, Bengaluru; Founder and CEO of Eagles Unbound.', url: siteURL() + '/founder', sameAs: ['https://x.com/majgenbhakuni'], ...(portrait ? { image: siteURL() + portrait.src } : {}) }}/>
  </>;
}
