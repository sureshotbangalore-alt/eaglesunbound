'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Brand } from '@/components/brand';
import type { User } from './shared';

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <main id="main" className="admin-login"><div className="login-story"><Link href="/"><Brand /></Link><div><p className="eyebrow">EAGLES UNBOUND / OPERATIONS</p><h2>BEHIND EVERY<br />GREAT EXPERIENCE.</h2><p>Your workspace for content, conversations and the next adventure.</p></div></div><form className="login-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const d = new FormData(e.currentTarget); try { onLogin(await api<User>('/admin/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(d)) })); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }}><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Welcome back.</h1><p className="admin-description">Sign in to manage Eagles Unbound.</p><label className="field">Email address<input type="email" required name="email" autoComplete="username" /></label><label className="field">Password<input type="password" required name="password" autoComplete="current-password" /></label><label className="field">Authenticator or recovery code (if enabled)<input name="code" maxLength={80} autoComplete="one-time-code" /></label>{error && <p className="notice error" role="alert">{error}</p>}<button className="button button-red" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button><Link href="/">← Back to the public website</Link></form></main>;
}
