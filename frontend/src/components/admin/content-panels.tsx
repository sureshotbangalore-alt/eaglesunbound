'use client';
import Link from 'next/link';
import { browserAPIURL, type ContentRecord } from '@/lib/api';
import { HomeSectionsEditor } from '@/components/home-sections-editor';
import { Field, recordNoun, requestStatuses, type Mutate, type Row } from './shared';

export function DashboardPanel({ stats }: { stats: Record<string, unknown> }) {
  return <><div className="stats-grid">{Object.entries(stats).map(([label, value]) => <div className="stat" key={label}><p>{label}</p><strong>{String(value)}</strong></div>)}</div><div className="admin-panel"><h2>Make the next experience happen.</h2><p className="admin-description">Start with pending bookings, follow up on enquiries, or update what visitors see.</p><div className="admin-compact-links"><Link href="/admin/bookings">Review bookings →</Link><Link href="/admin/enquiries">Open enquiries →</Link><Link href="/admin/pages">Edit homepage →</Link></div></div></>;
}

/** Homepage text, hero video and section order/visibility. */
export function HomepagePanel({ data, setData, busy, mutate }: { data: Record<string, unknown>; setData: (next: Record<string, unknown>) => void; busy: boolean; mutate: Mutate }) {
  const change = (key: string, value: string) => setData({ ...data, [key]: value });
  return <form className="admin-panel" onSubmit={async e => { e.preventDefault(); await mutate('/admin/content', 'PUT', data); }}><h2>Homepage storytelling</h2><div className="form-grid">{Object.keys(data).filter(key => key !== 'sections').map(key => <Field key={key} label={key.replaceAll('_', ' ')} name={key} value={data[key]} area={key.includes('description') || key.includes('subtitle')} onChange={change} required={!['hero_video', 'brand_tagline', 'hero_secondary'].includes(key)} />)}<HomeSectionsEditor value={data.sections as { id: string; visible?: boolean }[] | undefined} onChange={sections => setData({ ...data, sections })} /><div className="span-2"><button className="button button-red" disabled={busy}>{busy ? 'Saving…' : 'Save homepage'}</button><Link href="/" target="_blank" className="text-link dark-link" style={{ marginLeft: 20 }}>Preview website ↗</Link></div></div><p className="subtle-note" style={{ marginTop: 20 }}>Hero video accepts an approved HTTPS MP4 or WebM URL. Leave it blank to use the poster.</p></form>;
}

/** Programmes, activities, packages, clients and gallery: search, add, reorder, edit, delete. */
export function RecordsPanel({ module, rows, query, setQuery, busy, mutate, onAdd, onEdit, onMove }: {
  module: string; rows: Row[]; query: string; setQuery: (q: string) => void; busy: boolean; mutate: Mutate;
  onAdd: () => void; onEdit: (record: ContentRecord) => void; onMove: (index: number, direction: -1 | 1) => void;
}) {
  return <><div className="admin-toolbar"><input aria-label="Search records" placeholder="Search records…" value={query} onChange={e => setQuery(e.target.value)} /><button className="button button-red" onClick={onAdd}>Add {recordNoun(module)} +</button></div><div className="admin-records">{rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase())).map((r, idx, shown) => <div className="admin-record" key={r.id}><div><h2>{r.name}</h2><p>/{String(r.slug)} · Position {idx + 1}</p></div><div className="record-actions">{!query && <><button type="button" aria-label={`Move ${r.name} up`} disabled={busy || idx === 0} onClick={() => onMove(idx, -1)}>↑</button><button type="button" aria-label={`Move ${r.name} down`} disabled={busy || idx === shown.length - 1} onClick={() => onMove(idx, 1)}>↓</button></>}<span className={'badge' + (r.published ? '' : ' draft')}>{r.published ? 'Published' : 'Draft'}</span><button onClick={() => onEdit(r as unknown as ContentRecord)}>Edit</button><button onClick={async () => { if (confirm(`Delete “${r.name}”? This cannot be undone.`)) await mutate(`/admin/records/${module}/${r.id}`, 'DELETE', undefined, 'Record deleted.'); }}>Delete</button></div></div>)}{!rows.length && <div className="admin-panel"><h2>No records yet.</h2><p className="admin-description">Add approved content, keep it in draft, then publish when ready.</p></div>}</div></>;
}

/** Bookings and enquiries (Super Admin): search, status filter, CSV export, open details. */
export function RequestsPanel({ module, rows, query, setQuery, status, setStatus, onOpen }: {
  module: string; rows: Row[]; query: string; setQuery: (q: string) => void; status: string; setStatus: (s: string) => void; onOpen: (row: Row) => void;
}) {
  return <><div className="admin-toolbar"><input placeholder="Search by name…" aria-label="Search requests by name" value={query} onChange={e => setQuery(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter status"><option value="">All statuses</option>{requestStatuses(module).map(s => <option key={s}>{s}</option>)}</select><a href={browserAPIURL('/admin/export/' + module)} className="button button-outline">Export CSV ↓</a></div><div className="admin-records">{rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) && (!status || r.status === status)).map(r => <div className="admin-record" key={r.id}><div><h2>{r.name}</h2><p>{String(r.reference || r.category)} · {String(r.preferred_date || r.created_at).slice(0, 10)} · {String(r.email)}</p></div><div className="record-actions"><span className="badge">{r.status}</span><button onClick={() => onOpen(r)}>View & update →</button></div></div>)}{!rows.length && <div className="admin-panel"><h2>No {module} yet.</h2><p className="admin-description">New website submissions will appear here.</p></div>}</div></>;
}
