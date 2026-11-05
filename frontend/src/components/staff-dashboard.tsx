'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Lock, LogOut, Mail, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Brand } from './brand';

type Booking = { id: string; reference: string; name: string; email: string; mobile: string; programme: string; preferred_date: string; preferred_time: string; participants: number; group_type: string; organisation: string; message: string; details: Record<string, string | number>; status: string; created_at: string };
type Enquiry = { id: string; name: string; email: string; phone: string; category: string; message: string; details: Record<string, string | number>; status: string; created_at: string };

const BOOKING_STATUSES = ['Pending', 'Contacted', 'Confirmed', 'Cancelled', 'Completed'];
const ENQUIRY_STATUSES = ['New', 'Contacted', 'Resolved'];
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const day = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const label = (key: string) => key.replaceAll('_', ' ');

/** Read-only workspace for STAFF_VIEWER accounts: incoming bookings and enquiries, nothing else. */
export function StaffDashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<'bookings' | 'enquiries'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [b, e] = await Promise.all([api<Booking[]>('/admin/staff/bookings'), api<Enquiry[]>('/admin/staff/enquiries')]);
      setBookings(b); setEnquiries(e);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setStatus(''); setOpen(null); }, [tab]);

  const list = useMemo(() => {
    const rows = (tab === 'bookings' ? bookings : enquiries) as (Booking | Enquiry)[];
    return rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) && (!status || r.status === status));
  }, [tab, bookings, enquiries, query, status]);
  const pending = bookings.filter(b => b.status === 'Pending').length;
  const fresh = enquiries.filter(e => e.status === 'New').length;

  return <div className="staff-app">
    <header className="staff-top">
      <Link href="/" aria-label="Eagles Unbound website"><Brand/></Link>
      <div className="staff-who"><span className="staff-badge"><Lock size={12}/> Read-only</span><span>{email}</span><button type="button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>
    </header>
    <main id="main" className="staff-main">
      <div className="staff-head">
        <div><p className="staff-kicker">Eagles Unbound team</p><h1>Bookings &amp; enquiries</h1><p className="staff-sub">New requests from the website. This view is read-only; contact a super admin to update a request.</p></div>
        <button type="button" className="staff-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> {loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="staff-tabs" role="tablist" aria-label="Request type">
        <button role="tab" aria-selected={tab === 'bookings'} onClick={() => setTab('bookings')}><CalendarDays size={17}/> Bookings <b>{bookings.length}</b>{pending > 0 && <em>{pending} pending</em>}</button>
        <button role="tab" aria-selected={tab === 'enquiries'} onClick={() => setTab('enquiries')}><Mail size={17}/> Enquiries <b>{enquiries.length}</b>{fresh > 0 && <em>{fresh} new</em>}</button>
      </div>
      <div className="staff-tools">
        <label className="staff-search"><Search size={16}/><input placeholder="Search by name" aria-label="Search by name" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{(tab === 'bookings' ? BOOKING_STATUSES : ENQUIRY_STATUSES).map(s => <option key={s}>{s}</option>)}</select>
      </div>
      {error && <p className="staff-error" role="alert">{error}</p>}
      <div className="staff-list" role="tabpanel">
        {!loading && !list.length && <p className="staff-empty">No {tab} match your search yet.</p>}
        {list.map(r => {
          const b = tab === 'bookings' ? r as Booking : null;
          const e = tab === 'enquiries' ? r as Enquiry : null;
          const isOpen = open === r.id;
          return <article key={r.id} className={`staff-row${isOpen ? ' open' : ''}`}>
            <button type="button" className="staff-row-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
              <span className="sr-name"><strong>{r.name}</strong><small>{b ? b.reference : e?.category}</small></span>
              <span className="sr-what">{b ? b.programme || 'Programme not set' : e?.details.programme || 'General enquiry'}</span>
              <span className="sr-date">{b ? day(b.preferred_date) : when(r.created_at)}</span>
              <span className="sr-count">{b ? `${b.participants} people` : e?.details.participants ? `${e.details.participants} people` : '—'}</span>
              <span className={`sr-status s-${r.status.toLowerCase()}`}>{r.status}</span>
              <ChevronDown size={18} className="sr-chev"/>
            </button>
            {isOpen && <dl className="staff-detail">
              <div><dt>Email</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd></div>
              <div><dt>Phone</dt><dd><a href={`tel:${b ? b.mobile : e?.phone}`}>{b ? b.mobile : e?.phone}</a></dd></div>
              {b && <><div><dt>Programme</dt><dd>{b.programme || '—'}</dd></div><div><dt>Preferred date</dt><dd>{day(b.preferred_date)}{b.preferred_time ? ` · ${b.preferred_time}` : ''}</dd></div><div><dt>Participants</dt><dd>{b.participants}</dd></div><div><dt>Group type</dt><dd>{b.group_type}</dd></div>{b.organisation && <div><dt>Organisation</dt><dd>{b.organisation}</dd></div>}</>}
              {e && <div><dt>Category</dt><dd>{e.category}</dd></div>}
              {Object.entries(r.details).map(([k, v]) => <div key={k}><dt>{label(k)}</dt><dd>{String(v)}</dd></div>)}
              <div><dt>Received</dt><dd>{when(r.created_at)}</dd></div>
              <div><dt>Status</dt><dd>{r.status}</dd></div>
              {r.message && <div className="wide"><dt>Message</dt><dd>{r.message}</dd></div>}
            </dl>}
          </article>;
        })}
      </div>
    </main>
  </div>;
}
