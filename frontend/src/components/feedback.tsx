'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Star, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export type Testimonial = { id: string; name: string; visit_type: string; organisation: string; rating: number; message: string; date: string };
const VISITS = ['Corporate team', 'School', 'College', 'Family or friends', 'Individual', 'Other'];

const Stars = ({ value, size = 16 }: { value: number; size?: number }) => (
  <span className="tm-stars" role="img" aria-label={`${value} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill={i < value ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>
);

/** Approved visitor testimonials only (moderated by Super Admin). Renders nothing when there are none. */
export function Testimonials({ items, compact = false }: { items: Testimonial[]; compact?: boolean }) {
  if (!items.length) return null;
  const shown = compact ? items.slice(0, 3) : items;
  return (
    <ul className={`tm-grid${compact ? ' is-compact' : ''}`} data-stagger>
      {shown.map((t, i) => (
        <li key={t.id} className={i === 0 && !compact ? 'is-lead' : ''}>
          <figure>
            <Stars value={t.rating} />
            <blockquote>“{t.message}”</blockquote>
            <figcaption><strong>{t.name}</strong><span>{t.visit_type}{t.organisation ? ` · ${t.organisation}` : ''}</span></figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

/** Visitor feedback form: everything is reviewed before anything is published. */
export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    if (!rating) { setError('Please choose a star rating.'); return; }
    const f = new FormData(e.currentTarget);
    setState('sending');
    try {
      await api('/feedback', { method: 'POST', body: JSON.stringify({
        name: f.get('name'), email: f.get('email'), visit_type: f.get('visit_type'), organisation: f.get('organisation') || '',
        rating, message: f.get('message'), consent: f.get('consent') === 'on', publish_consent: f.get('publish_consent') === 'on', website: f.get('website') || '',
      }) });
      setState('sent');
    } catch (err) { setError((err as Error).message); setState('idle'); }
  }
  if (state === 'sent') return (
    <div className="fb-success" role="status"><CheckCircle2 size={34} aria-hidden="true" /><h3>Thank you for your feedback.</h3><p>Our team reads every message. If you allowed us to publish it, it may appear on the website after review.</p><Link className="text-link dark-link" href="/">Back to the home page</Link></div>
  );
  return (
    <form className="fb-form" onSubmit={submit} noValidate={false}>
      <fieldset className="fb-rating">
        <legend>How was your day with us? *</legend>
        <div role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(n => (
            <label key={n} className={n <= rating ? 'is-on' : ''}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
              <Star size={30} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden="true" /><span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">Your name *<input required name="name" autoComplete="name" minLength={2} maxLength={100} /></label>
      <label className="field">Email address *<input required name="email" type="email" autoComplete="email" maxLength={254} /><small>Only for our team. Never published.</small></label>
      <label className="field">You visited as *<select required name="visit_type" defaultValue=""><option value="" disabled>Select</option>{VISITS.map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="field">School, college or company (optional)<input name="organisation" maxLength={180} /></label>
      <label className="field span-2">Your feedback *<textarea required name="message" minLength={20} maxLength={1500} rows={5} placeholder="What stood out? What could we do better?" /></label>
      <label className="consent span-2"><input type="checkbox" name="consent" required /> I agree that Eagles Unbound may store this feedback to improve its experiences. *</label>
      <label className="consent span-2"><input type="checkbox" name="publish_consent" /> You may publish my feedback on the website with my first name and the initial of my surname.</label>
      <label className="honeypot" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {error && <p className="form-error span-2" role="alert">{error}</p>}
      <button className="button button-red span-2" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
    </form>
  );
}
