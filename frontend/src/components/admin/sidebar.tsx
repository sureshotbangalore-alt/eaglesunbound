'use client';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { adminOnly, nav, type User } from './shared';

/** Navigation for the Super Admin workspace; admin-only modules are hidden from other roles. */
export function AdminSidebar({ user, module, onSignOut }: { user: User; module: string; onSignOut: () => void }) {
  return <aside className="admin-sidebar"><Link href="/"><Brand /></Link><p className="eyebrow">CONTENT & OPERATIONS</p><nav aria-label="Administration">{nav.filter(n => user.role === 'admin' || !adminOnly.includes(n[0])).map(([slug, label, Icon]) => <Link key={slug} className={module === slug ? 'active' : ''} href={'/admin/' + slug}><Icon size={16} />{label}</Link>)}</nav><div className="sidebar-bottom"><Link href="/" target="_blank">View website ↗</Link><button onClick={onSignOut}>Sign out</button></div></aside>;
}
