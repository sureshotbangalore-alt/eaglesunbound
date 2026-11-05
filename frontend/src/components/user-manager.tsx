'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Account = { id: string; email: string; role: 'admin' | 'editor' | 'staff_viewer'; active: boolean; created_at: string };
export const ROLE_LABEL: Record<string, string> = { admin: 'Super Admin', editor: 'Content editor', staff_viewer: 'Staff viewer (read-only)' };

/** Super Admin only: create accounts, change roles, enable/disable and reset passwords. The API enforces the same rules. */
export function UserManager({ me }: { me: string }) {
  const [users, setUsers] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setUsers(await api<Account[]>('/admin/users')); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); await load(); setMessage(success); return true; } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  };
  const patch = (id: string, body: Partial<Account> & { password?: string }, success: string) => run(() => api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), success);

  return <>
    <form className="admin-panel" onSubmit={async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      if (await run(() => api('/admin/users', { method: 'POST', body: JSON.stringify(data) }), `Account created for ${data.email}. Share the password with them securely.`)) form.reset();
    }}>
      <h2>Create an account</h2>
      <p className="admin-description">Staff viewers can only read bookings and enquiries. Content editors manage website content. Super Admins have full access.</p>
      <div className="form-grid">
        <label className="field">Login email<input type="email" name="email" required autoComplete="off"/></label>
        <label className="field">Role<select name="role" defaultValue="staff_viewer">{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="field span-2">Temporary password (at least 12 characters)<input type="password" name="password" required minLength={12} autoComplete="new-password"/></label>
        <div className="span-2"><button className="button button-red" disabled={busy}>Create account</button></div>
      </div>
    </form>
    {error && <p className="notice error admin-status" role="alert">{error}</p>}
    {message && <p className="notice success admin-status" role="status">{message}</p>}
    <div className="admin-records" style={{ marginTop: 25 }}>
      {users.map(u => {
        const self = u.email === me;
        return <div className="admin-record" key={u.id}>
          <div><h2>{u.email}{self ? ' (you)' : ''}</h2><p>{ROLE_LABEL[u.role] || u.role} · created {u.created_at.slice(0, 10)}</p></div>
          <div className="record-actions">
            <span className={'badge' + (u.active ? '' : ' draft')}>{u.active ? 'Active' : 'Disabled'}</span>
            <select aria-label={`Role for ${u.email}`} value={u.role} disabled={busy || self} onChange={e => void patch(u.id, { role: e.target.value as Account['role'] }, `Role updated for ${u.email}. They will need to sign in again.`)}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {!self && <button type="button" disabled={busy} onClick={() => void patch(u.id, { active: !u.active }, u.active ? `${u.email} disabled and signed out.` : `${u.email} enabled.`)}>{u.active ? 'Disable' : 'Enable'}</button>}
            <button type="button" disabled={busy} onClick={() => { const password = prompt(`New password for ${u.email} (at least 12 characters)`); if (password) void patch(u.id, { password }, `Password reset for ${u.email}.`); }}>Reset password</button>
          </div>
        </div>;
      })}
    </div>
  </>;
}
