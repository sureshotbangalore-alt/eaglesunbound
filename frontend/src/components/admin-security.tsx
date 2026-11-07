'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
type Status = {available:boolean;enabled:boolean;recovery_codes_remaining:number};
export function AdminSecurity() {
  const [status,setStatus]=useState<Status>();const [password,setPassword]=useState('');const [code,setCode]=useState('');const [secret,setSecret]=useState('');const [recovery,setRecovery]=useState<string[]>([]);const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{api<Status>('/admin/security/mfa').then(setStatus).catch(e=>setError(e.message));},[]);
  async function action(mode:string) {
    setBusy(true);setError('');setMessage('');
    try {
      const result=await api<{secret?:string;recovery_codes?:string[];message?:string}>('/admin/security/mfa/'+mode,{method:'POST',body:JSON.stringify({password,code})});
      setCode('');setSecret(result.secret||'');setRecovery(result.recovery_codes||[]);setMessage(result.message||'Add the setup key to an authenticator, then enter its code below.');
      if(mode!=='setup'){setPassword('');setStatus(undefined);}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="admin-panel"><h2>Administrator MFA</h2><p className="admin-description">Add a time-based authenticator to your own administrator account. Recovery codes are shown once. Enabling or disabling MFA signs out every session on this account.</p>{status&&<p>{status.enabled?`Enabled · ${status.recovery_codes_remaining} recovery codes remaining.`:status.available?'Not enabled.':'Server setup required: configure MFA_ENCRYPTION_KEY before enrolment.'}</p>}{status?.available&&<form onSubmit={e=>{e.preventDefault();void action(status.enabled?'disable':secret?'confirm':'setup');}}><label className="field">Current password<input type="password" required maxLength={200} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{secret&&<div className="notice"><p>Enter this setup key manually in your authenticator. It expires after ten minutes. Keep it private.</p><code style={{overflowWrap:'anywhere'}}>{secret}</code></div>}{(secret||status.enabled)&&<label className="field">Authenticator or recovery code<input required maxLength={80} autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)}/></label>}<button className="button button-red" disabled={busy}>{busy?'Checking…':status.enabled?'Disable MFA':secret?'Confirm authenticator':'Set up authenticator'}</button></form>}{error&&<p role="alert" className="notice error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}{recovery.length>0&&<div className="notice"><h3>Save your recovery codes offline</h3><p>Each code works once. These codes are not saved in this browser.</p><pre style={{whiteSpace:'pre-wrap'}}>{recovery.join('\n')}</pre><a className="text-link dark-link" href="/admin/login">I saved these codes. Sign in again →</a></div>}{!status&&message&&!recovery.length&&<a href="/admin/login">Sign in again →</a>}</section>;
}
