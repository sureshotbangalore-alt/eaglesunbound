import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { MenuCollection } from '@/components/menu-collection';
import { EditorialPage } from '@/components/editorial-page';
import { PageWorld } from '@/components/page-world';
import { ExpeditionStory } from '@/components/expedition-story';
import { RecordCatalogue } from '@/components/record-catalogue';
import { PageHero } from '@/components/page-hero';
import { SplitLines } from '@/components/split-text';
import { ImageBand } from '@/components/image-band';
import { img } from '@/lib/imagery';
import { FounderProfile } from '@/components/founder-profile';
import { whatsappLink, WhatsAppIcon } from '@/lib/whatsapp';
import { PublicForm } from '@/components/public-form';
import { ActivityExplorer } from '@/components/activity-explorer';
import { serverAPI, type ContentRecord, type ContactSettings } from '@/lib/api';
import { pageMetadata, type FAQRecord } from '@/lib/seo';
const pages: Record<string, [string,string,string]> = {
  founder:['LEADERSHIP. WITH PURPOSE.','Meet the leadership behind Eagles Unbound.','Our Founder'],
  'food-and-dining':['GOOD FOOD. GREAT COMPANY.','Meal planning for your chosen programme. Confirm menus and dietary needs with our team.','Food & Dining'],
  'the-bootcamp':['FIND YOUR GRIT.','Explore the spirit of military-inspired obstacle challenges and teamwork in a civilian outdoor setting.','The Bootcamp'],
  'what-we-offer':['MAKE IT YOURS.','Outdoor experiences for teams, students and people who want to step beyond their everyday routine.','What We Offer'],
  activities:['MEET YOUR CHALLENGE.','Discover the Eagles Unbound activity library, from obstacle challenges and rope courses to outdoor recreation.','Activities'],
  about:['ADVENTURE. WITH PURPOSE.','Eagles Unbound brings people together through nature, adventure and experiential learning near Kanakapura Road, Bengaluru.','About'],
  'book-now':['YOUR NEXT CHAPTER.','Tell us about your group and preferred date. Our team will get in touch to discuss availability and arrangements.','Book Your Experience'],
  contact:['LET’S GET OUT THERE.','Have a question or an experience in mind? Start a conversation with the Eagles Unbound team.','Contact'],
  'privacy-policy':['YOUR DETAILS. YOUR TRUST.','How information submitted through this website is used to respond to enquiries and booking requests.','Privacy Policy'],
  'terms-and-conditions':['A CLEAR START.','Important information about using this website and requesting an Eagles Unbound experience.','Terms and Conditions'],
  'booking-policy':['PLAN WITH CONFIDENCE.','How booking requests work, what happens next and the details to confirm with our team.','Booking Policy'],
};
export async function generateMetadata({ params }: { params: Promise<{section:string}> }) {
  const {section}=await params;const page=pages[section];
  if(!page) return {};
  return pageMetadata('/'+section, page[2], page[1]);
}
export default async function SectionPage({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {section}=await params;const query=await searchParams;let page=pages[section];if(!page)notFound();
  const overrides=await serverAPI<{slug:string;title:string;intro:string;sections:{heading:string;body:string}[]}[]>('/public/pages');
  const custom=overrides.find(p=>p.slug===section);if(custom)page=[custom.title,custom.intro,page[2]];
  let body: React.ReactNode;
  if(section==='food-and-dining'){body=<MenuCollection programmes={await serverAPI<ContentRecord[]>('/public/programmes')}/>;} else if(section==='book-now') {
    const programmes=await serverAPI<ContentRecord[]>('/public/programmes');
    body=<section className="form-layout"><div className="form-intro"><p className="eyebrow">A REQUEST. THEN A CONVERSATION.</p><h2>GOOD EXPERIENCES<br/>START TOGETHER.</h2><p>Share a few details and we’ll help you find the right fit. Your preferred date is a starting point, and your request stays pending until our team confirms it.</p><p>No payment is collected on this website.</p><a className="button button-wa" href={whatsappLink(await serverAPI<ContactSettings>('/public/settings'))} target="_blank" rel="noreferrer"><WhatsAppIcon size={18}/> Prefer WhatsApp? Message us</a><Link className="text-link dark-link" href="/booking-policy">How booking works ↗</Link></div><PublicForm mode="booking" programmes={programmes} selected={query.programme} activity={query.activity} visitor={query.visitor}/></section>;
  } else if(section==='contact') {
    const s=await serverAPI<ContactSettings>('/public/settings');
    body=<section className="form-layout"><div className="form-intro"><h2>REAL PEOPLE.<br/>A REAL CONVERSATION.</h2><p>{s.address}</p><p><a className="text-link dark-link" href={`tel:${s.phone}`}>{s.phone}</a></p>{s.email&&<p><a href={`mailto:${s.email}`}>{s.email}</a></p>}{whatsappLink(s)&&<p><a className="button button-wa" href={whatsappLink(s)} target="_blank" rel="noreferrer"><WhatsAppIcon size={18}/> Chat on WhatsApp</a></p>}<a className="text-link dark-link" target="_blank" rel="noreferrer" href={s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}>Find us on the map ↗</a></div><PublicForm mode="enquiry" activity={query.activity} visitor={query.visitor} programmes={await serverAPI<ContentRecord[]>('/public/programmes')}/></section>;
  } else if(section==='founder') {
    body=<FounderProfile/>;
  } else if(section==='activities') {
    body=<section className="content-section"><ActivityExplorer activities={await serverAPI<ContentRecord[]>('/public/activities')}/></section>;
  } else if(section==='what-we-offer') { body=null;
  } else if(section==='the-bootcamp') {
    body=<><section className="content-section"><div className="intro-grid"><h2>THE OBSTACLE IS<br/>JUST THE BEGINNING.</h2><div><p className="lead">A military-inspired civilian adventure experience, grounded in teamwork, discipline and the willingness to try.</p><p>Obstacle activities can create opportunities to practise communication, make shared decisions and approach a physical challenge together.</p><p>This recreational experience is not an official armed-forces programme or military certification.</p></div></div><ImageBand layout="pair" pictures={[img.rope, img.climb]}/><div className="notice">Bootcamp routines, duration, inclusions, participant requirements and availability are awaiting client confirmation. Contact the team to discuss what may suit your group.</div></section><ExpeditionStory/><section className="stages" data-hscroll><div className="stages-sticky"><div className="stages-head"><div><p className="label" style={{color:'var(--brass)',marginBottom:22}}>From the first briefing to a shared reflection</p><SplitLines text={'The experience.\nTogether.'} className="display-xl"/></div><p>Programme discussions can cover the stages below. The actual format, timings, activities and participant requirements are confirmed by the team for your group.</p></div><ol className="stages-track" data-hscroll-track>{['Welcome and briefing','Team formation','Challenge introduction','Obstacle activities','Group challenges','Leadership experiences','Reflection and achievement'].map((stage,i)=>{const pic=[img.cheer,img.students,img.forestWalk,img.wall,img.trek,img.climb,img.campfire][i];return <li key={stage}><figure className="stage-photo"><Image src={pic.src} alt={pic.alt} fill sizes="(max-width:900px) 90px, 26vw"/></figure><p className="label">Stage</p><span aria-hidden="true">0{i+1}</span><h3>{stage}</h3></li>;})}</ol><div className="stages-meter" aria-hidden="true"/></div></section><section className="content-section"><div className="info-columns"><div><h2>BEFORE YOU ARRIVE.</h2><p>Ask the team about the current programme format, physical requirements, what to bring and supervision arrangements. Share relevant access needs so you can discuss suitability before visiting.</p><Link className="text-link dark-link" href="/faqs">Questions before you go ↗</Link></div><div><h2>EXPLORE THE COURSE.</h2><p>Discover the published activity library. Activities included in a particular experience should be confirmed when discussing your request.</p><Link className="text-link dark-link" href="/activities">Explore activities ↗</Link></div></div></section></>;
  } else if(section==='about') {
    body=<><section className="content-section"><div className="intro-grid"><h2>MORE OUTDOORS.<br/>MORE POSSIBILITY.</h2><div><p className="lead">Eagles Unbound is an outdoor adventure and experiential learning destination in South Bengaluru.</p><p>The published programmes include corporate, student and adventure experiences. The activity library brings together military-inspired obstacles, rope courses, team tasks and outdoor recreation.</p><p>Our philosophy centres on self-discovery through nature and adventure: a chance to try something new and learn by taking part.</p></div></div><ImageBand pictures={[img.ghats]} caption="Self-discovery through nature and adventure."/><div style={{marginTop:'clamp(60px,8vw,120px)'}}><h2 className="statement"><small>Our vision</small>To create opportunities for personal discovery and growth through adventure and a connection with the outdoors.</h2><h2 className="statement"><small>Our mission</small>To encourage a love for outdoor experiences while supporting confidence, teamwork and learning.</h2></div></section><section className="team-block content-section"><h2>THE PEOPLE<br/>BEHIND THE DAY.</h2><div><p>The existing Eagles Unbound website describes a team with ex-Army and outbound facilitation experience. Updated individual profiles and qualifications are being prepared for client approval.</p><p>For current facilitation and supervision information, speak directly with the team while planning your visit.</p><Link href="/contact" className="text-link dark-link">Meet us through a conversation ↗</Link></div></section></>;
  } else {
    body=<section className="content-section prose">{section==='privacy-policy'?<><div className="notice">Pre-launch privacy notice. The business must approve its final privacy policy, retention periods and data contact before public launch.</div><h2>Information you share</h2><p>The enquiry and booking forms collect the contact details, group information and message you submit. Booking requests also include a preferred date and participant count.</p><h2>How these details are used</h2><p>Submitted details are stored to enable the Eagles Unbound team to respond to the request and manage follow-up. Access to customer records requires an authorised administrator session.</p><h2>Questions about your information</h2><p>Contact the team to discuss your submitted details or request correction or deletion. Do not include medical records or other sensitive personal information in the forms.</p><Link href="/contact">Contact Eagles Unbound ↗</Link></>:section==='booking-policy'?<><h2>A request comes first</h2><p>Submitting the booking form saves a request and generates a reference. It does not guarantee a reservation. Requests begin as Pending and require team confirmation.</p><h2>Dates and group arrangements</h2><p>Tell us your preferred date, programme and group size. The team will discuss availability, timings, inclusions and any requirements with you before confirming arrangements.</p><h2>Pricing, changes and cancellation</h2><p>No online payment is collected in this release. Confirm current pricing, payment arrangements, changes, cancellations and refund conditions directly with the team before making a commitment.</p><div className="notice">Final cancellation, payment and waiver terms require client approval before public launch.</div><p style={{marginTop:25}}><Link href="/book-now">Request your experience ↗</Link></p></>:<><div className="notice">Pre-launch information. Final business terms must be supplied and approved before public launch.</div><h2>Using the website</h2><p>This website introduces Eagles Unbound programmes and activities. Published descriptions help start a conversation; confirm availability, suitability and programme details with the team.</p><h2>Experience information</h2><p>Eagles Unbound offers military-inspired civilian adventure experiences. Nothing on this site represents official military affiliation, military service training or military certification.</p><h2>Before making arrangements</h2><p>Outdoor activities may involve physical risk. Ask the team about applicable participation requirements and approved safety information. A submitted booking request is subject to confirmation.</p><Link href="/booking-policy">Read booking information ↗</Link></>}</section>;
  }
  if(custom&&section==='about') body=<EditorialPage section={section} sections={custom.sections}/>;
  if(section==='what-we-offer') {
    const items=await serverAPI<ContentRecord[]>('/public/programmes');
    body=<><section className="content-section"><h2 className="display-l">Choose your programme.</h2><RecordCatalogue items={items} kind="programmes"/></section><section className="content-section audience-guides"><h2 className="display-l">For your group.</h2>{overrides.filter(p=>['corporate','schools-and-colleges','kids-experiences'].includes(p.slug)).map(p=><details className="catalogue-record" id={p.slug} key={p.slug}><summary><h3>{p.title}</h3><b aria-hidden="true">+</b></summary><div className="record-content"><p>{p.intro}</p>{p.sections.map((s,i)=><section key={i}><h4>{s.heading}</h4><p>{s.body}</p></section>)}</div></details>)}</section></>;
  }
  if(section==='food-and-dining') {
    page=['STAY. DINE. RECONNECT.','Camping, overnight arrangements and programme meals in one place.','Stay & Dining'];
    const stay=overrides.find(p=>p.slug==='accommodation');
    body=<>{stay&&<section className="content-section" id="stay"><h2 className="display-l">Stay for the outdoors.</h2>{stay.sections.map((s,i)=><details className="catalogue-record" key={i}><summary><h3>{s.heading}</h3><b aria-hidden="true">+</b></summary><div className="record-content"><p>{s.body}</p></div></details>)}</section>}{body}</>;
  }
  if(section==='contact') {
    const faqs=await serverAPI<FAQRecord[]>('/public/faqs');
    body=<>{body}<section id="faqs" className="content-section"><h2 className="display-l">Before you go.</h2><div className="faq-list">{faqs.map(f=><details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></section></>;
  }
  return <main id="main" className={`inner-page page-${section}${/policy|terms-and/.test(section)?' practical-page':''}`}><PageHero title={page[0]} intro={page[1]} label={page[2]} path={'/'+section} booking={['about','activities'].includes(section)?'/book-now':undefined}/>{section!=='the-bootcamp'&&<PageWorld path={'/'+section}/>} {body}</main>;
}
