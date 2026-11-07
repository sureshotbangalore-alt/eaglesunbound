import { serverAPI } from '@/lib/api';
import { PageHero } from './page-hero';
import { CookieSettingsButton } from './cookie-consent';
type Policy = {slug:string;title:string;intro:string;sections:{heading:string;body:string}[]};
export async function approvedPolicy(slug:string, label:string) {
  const pages = await serverAPI<Policy[]>('/public/pages');
  const policy = pages.find(page=>page.slug===slug);
  if(!policy) return null;
  return <main id="main" className="inner-page practical-page"><PageHero title={policy.title} intro={policy.intro} label={label} path={'/'+slug}/><article className="content-section prose policy-copy">{policy.sections.map((section,i)=><section key={i}><h2>{section.heading}</h2><p style={{whiteSpace:'pre-line'}}>{section.body}</p></section>)}<p><CookieSettingsButton/></p></article></main>;
}
