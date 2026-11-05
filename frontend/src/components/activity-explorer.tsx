'use client';
import { RecordCatalogue } from './record-catalogue';
import { useState } from 'react';
import Image from 'next/image';
import type { ContentRecord } from '@/lib/api';
import { categoryImage, img } from '@/lib/imagery';
function categories(a:ContentRecord):string[]{
  if(Array.isArray(a.details.categories)&&a.details.categories.length)return a.details.categories.map(String);
  if(/obstacle|team|mind|snake/i.test(a.name))return ['Team & obstacles'];
  if(/rope|climb|zip/i.test(a.name))return ['Heights & ropes'];
  if(/archery|rifle/i.test(a.name))return ['Aim & focus'];return ['The outdoors'];
}
export function ActivityExplorer({activities}:{activities:ContentRecord[]}){
  
  const [category,setCategory]=useState('All activities');const [search,setSearch]=useState('');const [audience,setAudience]=useState('All audiences');
  const allCategories=[...new Set(activities.flatMap(categories))].sort();
  const shown=activities.filter(a=>(category==='All activities'||categories(a).includes(category))&&(audience==='All audiences'||!Array.isArray(a.details.audiences)||a.details.audiences.includes(audience))&&(`${a.name} ${a.description} ${JSON.stringify(a.details.aliases||[])}`).toLowerCase().includes(search.toLowerCase()));
  return <><div className="catalogue-tools"><label className="field">Find an activity<input type="search" placeholder="Search activities, challenges and experiences" value={search} onChange={e=>{setSearch(e.target.value);}}/></label><label className="field">Your group<select value={audience} onChange={e=>{setAudience(e.target.value);}}>{['All audiences','School','College','Corporate','Family','Individual','Other'].map(v=><option key={v}>{v}</option>)}</select></label></div><p className="programme-meta-note">Audience filtering helps start a conversation. Age requirements and activity suitability must be confirmed with the team.</p><div className="category-tiles" aria-label="Activity categories">{['All activities',...allCategories].map(c=>{const pic=c==='All activities'?img.heroTeam:categoryImage[c]||img.ghats;const count=c==='All activities'?activities.length:activities.filter(a=>categories(a).includes(c)).length;return <button key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);}}><Image src={pic.src} alt="" fill sizes="(max-width:700px) 50vw, 20vw"/><span className="ct-name">{c}</span><span className="ct-count" aria-hidden="true">{String(count).padStart(2,'0')}</span></button>;})}</div><p className="tiles-note">Category images are illustrative photographs and AI-generated concepts.</p><p className="small" role="status">{shown.length} experiences to explore</p><RecordCatalogue items={shown} kind="activities"/>{!shown.length&&<p className="notice">No matching activities. Try another search or discuss your group with the team.</p>}</>;
}
