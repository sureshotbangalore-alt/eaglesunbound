'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';
import type { Mutate } from './shared';

type Feedback = { id: string; name: string; email: string; visit_type: string; organisation: string; rating: number; message: string; publish_consent: boolean; status: 'Pending' | 'Approved' | 'Rejected'; display_name: string; admin_notes: string; created_at: string; approved_at: string | null };
const order = { Pending: 0, Approved: 1, Rejected: 2 } as const;

/** Super Admin: review visitor feedback and decide what is published as a testimonial. */
export function FeedbackPanel({ rows, mutate, busy }: { rows: Feedback[]; mutate: Mutate; busy: boolean }) {
  const [filter, setFilter] = useState<'All' | Feedback['status']>('Pending');
  const [drafts, setDrafts] = useState<Record<string, { display_name: string; admin_notes: string }>>({});
  const list = [...rows].sort((a, b) => order[a.status] - order[b.status] || b.created_at.localeCompare(a.created_at)).filter(r => filter === 'All' || r.status === filter);
  const draft = (r: Feedback) => drafts[r.id] ?? { display_name: r.display_name, admin_notes: r.admin_notes };
  const set = (r: Feedback, key: 'display_name' | 'admin_notes', value: string) => setDrafts(d => ({ ...d, [r.id]: { ...draft(r), [key]: value } }));
  const save = (r: Feedback, status: Feedback['status'], note: string) => mutate(`/admin/feedback/${r.id}`, 'PATCH', { status, ...draft(r) }, note);
  const counts = (s: Feedback['status']) => rows.filter(r => r.status === s).length;
  return (
    <section className="feedback-admin">
      <div className="panel-head"><p>Approve feedback to publish it as a testimonial. Only feedback whose author allowed publishing can be approved. Email addresses and notes are never shown publicly.</p></div>
      <div className="fa-filters" role="tablist" aria-label="Filter feedback">
        {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(f => <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f}{f !== 'All' && <small>{counts(f)}</small>}</button>)}
      </div>
      {list.length === 0 && <p className="empty-state">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}feedback yet.</p>}
      <ul className="fa-list">
        {list.map(r => (
          <li key={r.id} className={`fa-item is-${r.status.toLowerCase()}`}>
            <div className="fa-meta">
              <span className="fa-stars" role="img" aria-label={`${r.rating} out of 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} fill={i < r.rating ? 'currentColor' : 'none'} />)}</span>
              <strong>{r.name}</strong><span>{r.visit_type}{r.organisation ? ` · ${r.organisation}` : ''}</span><span>{r.email}</span><span>{r.created_at.slice(0, 10)}</span>
              <span className={`fa-badge ${r.status.toLowerCase()}`}>{r.status}</span>
              {!r.publish_consent && <span className="fa-badge private">Private: not for publishing</span>}
            </div>
            <blockquote>{r.message}</blockquote>
            <div className="fa-edit">
              <label className="field">Public name<input value={draft(r).display_name} placeholder="Leave blank to show first name and initial" maxLength={100} onChange={e => set(r, 'display_name', e.target.value)} /></label>
              <label className="field">Private notes<input value={draft(r).admin_notes} maxLength={2000} onChange={e => set(r, 'admin_notes', e.target.value)} /></label>
            </div>
            <div className="fa-actions">
              {r.status !== 'Approved' && r.publish_consent && <button type="button" className="button button-red" disabled={busy} onClick={() => save(r, 'Approved', 'Approved and published.')}>Approve & publish</button>}
              {r.status !== 'Rejected' && <button type="button" className="button" disabled={busy} onClick={() => save(r, 'Rejected', 'Feedback rejected.')}>Reject</button>}
              {r.status !== 'Pending' && <button type="button" className="button" disabled={busy} onClick={() => save(r, 'Pending', 'Moved back to pending.')}>Back to pending</button>}
              <button type="button" className="button" disabled={busy} onClick={() => save(r, r.status, 'Saved.')}>Save notes</button>
              <button type="button" className="text-link danger" disabled={busy} onClick={() => { if (confirm(`Delete feedback from ${r.name}? This cannot be undone.`)) void mutate(`/admin/feedback/${r.id}`, 'DELETE', undefined, 'Feedback deleted.'); }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
