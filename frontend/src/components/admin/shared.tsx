import { LayoutDashboard, FileText, Mountain, Compass, CalendarDays, Mail, Users, Images, Settings, Search, Image as ImageIcon, Package, HelpCircle, ShieldCheck } from 'lucide-react';
import type { ContentRecord } from '@/lib/api';

export type User = { email: string; role: string };
export type Row = Record<string, unknown> & { id: string; name: string; status: string; internal_notes: string };
/** Saves through the admin API and reloads; resolves true on success. Error and success messages are shown by the page. */
export type Mutate = (path: string, method: string, payload: unknown, success?: string) => Promise<boolean>;

export const nav = [['dashboard', 'Dashboard', LayoutDashboard], ['pages', 'Website content', FileText], ['programmes', 'Programmes', Compass], ['activities', 'Activities', Mountain], ['packages', 'Packages', Package], ['bookings', 'Bookings', CalendarDays], ['enquiries', 'Enquiries', Mail], ['clients', 'Clients', Users], ['gallery', 'Gallery', Images], ['media', 'Media library', ImageIcon], ['faqs', 'FAQs', HelpCircle], ['settings', 'Settings', Settings], ['seo', 'SEO & discovery', Search], ['users', 'Users & roles', ShieldCheck]] as const;
export const adminOnly = ['dashboard', 'bookings', 'enquiries', 'settings', 'users'];
export const recordModules = ['programmes', 'activities', 'clients', 'gallery', 'packages'];
export const requestModules = ['bookings', 'enquiries'];
// Where each role lands after signing in. Staff viewers only ever see the read-only requests view.
export const home = (role: string) => role === 'staff_viewer' ? '/admin/requests' : '/admin/dashboard';
export const blank: Partial<ContentRecord> = { name: '', slug: '', description: '', image: '', display_order: 0, published: false, details: {} };
export const requestStatuses = (module: string) => module === 'bookings' ? ['Pending', 'Contacted', 'Confirmed', 'Cancelled', 'Completed'] : ['New', 'Contacted', 'Resolved'];
export const recordNoun = (module: string) => module === 'activities' ? 'activity' : module === 'gallery' ? 'album' : module === 'clients' ? 'client' : module === 'packages' ? 'package' : 'programme';

export function Field({ label, name, value, onChange, area = false, type = 'text', required = false }: { label: string; name: string; value: unknown; onChange: (name: string, value: string) => void; area?: boolean; type?: string; required?: boolean }) {
  return <label className={'field' + (area ? ' span-2' : '')}>{label}{area ? <textarea value={String(value ?? '')} required={required} onChange={e => onChange(name, e.target.value)} /> : <input type={type} value={String(value ?? '')} required={required} onChange={e => onChange(name, e.target.value)} />}</label>;
}
