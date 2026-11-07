'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookingJourney } from './booking-journey';
import { ArrowUpRight } from 'lucide-react';
import { api, type ContentRecord } from '@/lib/api';
export function PublicForm({ mode, programmes = [], selected = '', activity = '', visitor = '' }: { mode: 'booking' | 'enquiry'; programmes?: ContentRecord[]; selected?: string; activity?: string; visitor?:string }) {
  const [busy,setBusy] = useState(false);
  const [participants,setParticipants]=useState('2');
  const [journey,setJourney]=useState(0);
  const [error,setError] = useState('');
  const [result,setResult] = useState<{ message: string; reference?: string } | null>(null);
  const booking = mode === 'booking';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');setBusy(true);
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form.entries());
    data.consent = form.get('consent') === 'on';
    if (data.participants) data.participants = Number(data.participants); else if(!booking) delete data.participants;
    if(!data.preferred_date&&!booking)delete data.preferred_date;
    for(const key of ['vegetarian_meals','non_vegetarian_meals'])data[key]=Number(data[key]||0);
    try { setResult(await api(booking ? '/bookings' : '/enquiries', { method: 'POST', body: JSON.stringify(data) })); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (result) return <div className="success-state" role="status">{booking&&<BookingJourney step={2}/>}<p className="eyebrow">{booking ? 'REQUEST RECEIVED' : 'THANK YOU FOR REACHING OUT'}</p><h2>{booking ? 'Your next adventure starts with a conversation.' : 'Let’s make a plan.'}</h2>{result.reference && <><p>Your booking request reference</p><span className="reference">{result.reference}</span></>}<p>{result.message}</p>{booking && <p className="small">Please wait for the team to confirm availability and arrangements before making travel plans.</p>}<Link href="/" className="text-link dark-link">Back to the experience <ArrowUpRight size={16}/></Link></div>;
  return <form onSubmit={submit} onChange={event=>{if(booking){const fields=new FormData(event.currentTarget);setJourney(fields.get('programme_id')&&fields.get('preferred_date')?1:0);}}}>{booking&&<BookingJourney step={journey} busy={busy}/>}<div className="form-grid">
    <label className="field">Your name *<input required name="name" autoComplete="name" minLength={2} maxLength={100}/></label>
    <label className="field">Email address *<input required name="email" type="email" autoComplete="email" maxLength={254}/></label>
    <label className="field">Mobile number *<input required name={booking ? 'mobile' : 'phone'} type="tel" autoComplete="tel" pattern="[+0-9 ()\-]{7,25}" maxLength={25} placeholder="+91"/></label>
    {booking ? <><label className="field">Choose your programme *<select name="programme_id" required defaultValue={programmes.find(p=>p.slug===selected)?.id || ''}><option value="" disabled>Select an experience</option>{programmes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="field">Preferred date *<input required type="date" name="preferred_date" min={new Date().toLocaleDateString('en-CA')}/></label><div className="field"><label htmlFor="participant-count">Number of participants *</label><div className="participant-stepper"><button type="button" aria-label="Remove one participant" onClick={()=>setParticipants(String(Math.max(1,Number(participants||1)-1)))}>−</button><input id="participant-count" required name="participants" type="number" min={1} max={1000} value={participants} onChange={e=>setParticipants(e.target.value)}/><button type="button" aria-label="Add one participant" onClick={()=>setParticipants(String(Math.min(1000,Number(participants||1)+1)))}>+</button></div></div><label className="field">Group type *<select required name="group_type" defaultValue={visitor||''}><option value="" disabled>Select group type</option>{['School','College','Corporate','Family','Individual','Friends','Other'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Organisation (optional)<input name="organisation" maxLength={180} autoComplete="organization"/></label></> : <label className="field">What can we help with? *<select name="category" required><option>General enquiry</option><option>Corporate experience</option><option>Student programme</option><option>Bootcamp enquiry</option><option>Family or group experience</option><option>Existing booking request</option></select></label>}
    {!booking&&<><label className="field">Visitor category<select name="visitor_category" defaultValue={['School','College','Corporate','Family','Individual','Other'].includes(visitor)?visitor:'Other'}>{['School','College','Corporate','Family','Individual','Other'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Organisation<input name="organisation" maxLength={180} autoComplete="organization"/></label><label className="field">Programme interest<select name="programme"><option value="">Discuss a custom experience</option>{programmes.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></label><label className="field">Preferred date (optional)<input type="date" name="preferred_date" min={new Date().toLocaleDateString('en-CA')}/></label><label className="field">Participants (optional)<input type="number" name="participants" min={1} max={1000}/></label></>}
    <label className="field">Vegetarian meal count (optional)<input type="number" min={0} max={1000} name="vegetarian_meals" defaultValue={0}/></label><label className="field">Non-vegetarian meal count (optional)<input type="number" min={0} max={1000} name="non_vegetarian_meals" defaultValue={0}/></label><label className="field span-2">Special requirements (optional)<textarea name="special_requirements" maxLength={3000} placeholder="Dietary needs, access requirements or other arrangements to discuss with the team"/></label>
    <label className="field span-2">{booking ? 'Tell us about your group (optional)' : 'Your message *'}<textarea name="message" required={!booking} minLength={booking ? 0 : 10} maxLength={3000} defaultValue={activity ? `I am interested in ${activity}.` : ''} placeholder="Your interests, questions or special requirements"/></label>
    <label className="honeypot" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <label className="consent span-2"><input type="checkbox" name="consent" required/><span>I agree that Eagles Unbound may use these details to respond to my request. Read the <Link href="/privacy-policy">privacy notice</Link>. {booking && <>I understand this is a request, subject to availability and team confirmation.</>}</span></label>
    {error && <div className="notice error span-2" role="alert">{error}</div>}
    <div className="span-2"><button disabled={busy} className="button button-red">{busy&&<span className="submission-spinner" aria-hidden="true"/>}{busy ? 'Sending your request…' : booking ? 'Send booking request' : 'Send your enquiry'} <ArrowUpRight size={18}/></button><p className="small" style={{marginTop:15,color:'#4e5b44'}}>No payment is collected here. {booking && <Link href="/booking-policy">Read booking information ↗</Link>}</p></div>
  </div></form>;
}
