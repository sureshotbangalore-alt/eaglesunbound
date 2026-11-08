'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminSecurity } from '@/components/admin-security';
import { StaffDashboard } from '@/components/staff-dashboard';
import { UserManager, ROLE_LABEL } from '@/components/user-manager';
import { api, browserAPIURL, type ContentRecord } from '@/lib/api';
import { PageEditor } from '@/components/page-editor';
import type { SEORecord, FAQRecord } from '@/lib/seo';
import { Login } from '@/components/admin/login';
import { AdminSidebar } from '@/components/admin/sidebar';
import { DashboardPanel, HomepagePanel, RecordsPanel, RequestsPanel } from '@/components/admin/content-panels';
import { FaqPanel, MasterReviewPanel, MediaPanel, SeoPanel, SettingsPanel, type BlockedDate } from '@/components/admin/site-panels';
import { FaqModal, RecordEditorModal, RequestDetailModal } from '@/components/admin/editor-modals';
import { FeedbackPanel } from '@/components/admin/feedback-panel';
import { blank, home, nav, recordModules, requestModules, type Row, type User } from '@/components/admin/shared';

// Container for the administration workspace: owns the data, saving and selection state; the panels in
// components/admin only render and call back.
export default function AdminPage({params}:{params:Promise<{segments?:string[]}>}) {
  const {segments}=use(params);const module=segments?.[0]||'dashboard';const router=useRouter();
  const [user,setUser]=useState<User|null|undefined>(undefined);
  const [data,setData]=useState<unknown>(null);const [error,setError]=useState('');const [message,setMessage]=useState('');const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<Partial<ContentRecord>|null>(null);
  const [query,setQuery]=useState('');const [status,setStatus]=useState('');const [selected,setSelected]=useState<Row|null>(null);
  const [faq,setFaq]=useState<Partial<FAQRecord>|null>(null);
  const [seo,setSeo]=useState<SEORecord>({page:'/',title:'',description:'',canonical:'',og_title:'',og_description:'',image:'',image_alt:'',noindex:false});
  const [masterReview,setMasterReview]=useState<Record<string,unknown>>({});
  const [blocked,setBlocked]=useState<BlockedDate[]>([]);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      if(module==='login'||module==='users')return;
      const path=module==='dashboard'?'/admin/overview':module==='pages'?'/admin/content':['settings','media','seo','faqs','feedback'].includes(module)?'/admin/'+module:'/admin/records/'+module;
      setData(await api(path));
      if(module==='settings'){setBlocked(await api('/admin/blocked-dates'));setMasterReview(await api('/admin/master-review'));}
    }catch(e){setError((e as Error).message);}finally{setLoading(false);}
  },[module]);
  useEffect(()=>{api<User>('/admin/me').then(setUser).catch(()=>setUser(null));},[]);
  useEffect(()=>{if(user?.role==='staff_viewer'){if(module!=='requests')router.replace('/admin/requests');return;}if(user){setData(null);setMessage('');setEditing(null);setSelected(null);setFaq(null);setQuery('');setStatus('');if(module==='login'||module==='requests')router.replace('/admin/dashboard');else void load();}},[user,module,load,router]);
  async function mutate(path:string,method:string,payload:unknown,success='Saved. Changes are live on the website.') {
    setBusy(true);setMessage('');setError('');
    try{await api(path,{method,body:payload===undefined?undefined:JSON.stringify(payload)});await load();setMessage(success);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}
  }
  /** Swap a record with its neighbour and renumber display_order in steps of 10 so the public order matches. */
  async function move(list:ContentRecord[],index:number,direction:-1|1){
    const target=index+direction;if(target<0||target>=list.length)return;
    const next=[...list];[next[index],next[target]]=[next[target],next[index]];
    setBusy(true);setMessage('');setError('');
    try{for(let i=0;i<next.length;i++)if(next[i].display_order!==i*10)await api('/admin/records/'+module+'/'+next[i].id,{method:'PUT',body:JSON.stringify({...next[i],display_order:i*10})});await load();setMessage('Order saved. The public website now uses this order.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function upload(body:FormData){
    setBusy(true);setError('');
    try{const response=await fetch(browserAPIURL('/admin/media/upload'),{method:'POST',credentials:'include',headers:{'X-Requested-With':'EaglesAdmin'},body});const result=await response.json();if(!response.ok)throw new Error(result.detail||'Upload failed');await load();setMessage('Media uploaded.');}catch(err){setError((err as Error).message);}finally{setBusy(false);}
  }
  const signOut=async()=>{await api('/admin/logout',{method:'POST'});setUser(null);router.replace('/admin/login');};
  if(user===undefined)return <main id="main" className="admin-loading">Loading your workspace…</main>;
  if(!user)return <Login onLogin={u=>{setUser(u);router.replace(home(u.role));}}/>;
  if(user.role==='staff_viewer')return <StaffDashboard email={user.email} onSignOut={signOut}/>;
  const title=nav.find(n=>n[0]===module)?.[1]||'Page not found';
  const rows=Array.isArray(data)?data as Row[]:[];
  const isRecords=recordModules.includes(module);
  const isRequests=requestModules.includes(module);
  const recordData=(data&&!Array.isArray(data)?data:{}) as Record<string,unknown>;
  return <div className="admin-body"><AdminSidebar user={user} module={module} onSignOut={signOut}/><main id="main" className="admin-main"><div className="admin-topbar"><span>EAGLES UNBOUND / WORKSPACE</span><span>{user.email} · {ROLE_LABEL[user.role]||user.role}</span></div><div className="admin-content"><p className="eyebrow muted">MANAGE / {module.toUpperCase()}</p><h1>{title}</h1><p className="admin-description">{module==='pages'?'Edit the homepage. Saved content is read directly by the public website.':isRequests?'Every request is stored in the database. Review details and record your follow-up.':'Keep your website accurate, useful and ready for the next visitor.'}</p>{error&&<p className="notice error admin-status" role="alert">{error}</p>}{message&&<p className="notice success admin-status" role="status">{message}</p>}{loading&&<p role="status">Loading records…</p>}
    {!loading&&module==='dashboard'&&<DashboardPanel stats={recordData}/>}
    {module==='pages'&&<PageEditor/>}
    {module==='users'&&user.role==='admin'&&<><AdminSecurity/><UserManager me={user.email}/></>}
    {!loading&&module==='pages'&&data!==null&&<HomepagePanel data={recordData} setData={setData} busy={busy} mutate={mutate}/>}
    {isRecords&&!loading&&<RecordsPanel module={module} rows={rows} query={query} setQuery={setQuery} busy={busy} mutate={mutate} onAdd={()=>setEditing({...blank,display_order:rows.length*10})} onEdit={setEditing} onMove={(index,direction)=>void move(rows as unknown as ContentRecord[],index,direction)}/>}
    {isRequests&&!loading&&<RequestsPanel module={module} rows={rows} query={query} setQuery={setQuery} status={status} setStatus={setStatus} onOpen={setSelected}/>}
    {module==='settings'&&!loading&&data!==null&&<SettingsPanel data={recordData} setData={setData} busy={busy} mutate={mutate} blocked={blocked}/>}
    {module==='settings'&&Object.keys(masterReview).length>0&&<MasterReviewPanel review={masterReview}/>}
    {module==='faqs'&&!loading&&<FaqPanel rows={rows as unknown as FAQRecord[]} mutate={mutate} onAdd={()=>setFaq({question:'',answer:'',page:'/faqs',published:false,display_order:0})} onEdit={setFaq}/>}
    {module==='feedback'&&!loading&&user.role==='admin'&&<FeedbackPanel rows={rows as unknown as Parameters<typeof FeedbackPanel>[0]['rows']} mutate={mutate} busy={busy}/>}
    {module==='seo'&&!loading&&<SeoPanel rows={rows as unknown as SEORecord[]} seo={seo} setSeo={setSeo} busy={busy} mutate={mutate}/>}
    {module==='media'&&!loading&&<MediaPanel rows={rows} busy={busy} mutate={mutate} onUpload={upload}/>}
    {!nav.some(n=>n[0]===module)&&module!=='login'&&<div className="admin-panel"><h2>That workspace page doesn’t exist.</h2><Link href="/admin/dashboard">Return to dashboard →</Link></div>}
  </div></main>
  {editing&&<RecordEditorModal module={module} editing={editing} setEditing={setEditing} busy={busy} error={error} mutate={mutate}/>}
  {selected&&<RequestDetailModal module={module} selected={selected} setSelected={setSelected} busy={busy} mutate={mutate}/>}
  {faq&&<FaqModal faq={faq} setFaq={setFaq} busy={busy} mutate={mutate}/>}
  </div>;
}
