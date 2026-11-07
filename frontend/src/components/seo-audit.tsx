'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
export function SEOAudit(){
 const [audit,setAudit]=useState<{overrides:number;warnings:{page:string;message:string}[];note:string}>();const [error,setError]=useState('');
 useEffect(()=>{api<NonNullable<typeof audit>>('/admin/seo/audit').then(setAudit).catch(e=>setError(e.message));},[]);
 return <section className="admin-panel"><h2>Metadata health</h2>{error&&<p role="alert">{error}</p>}{audit&&<><p>{audit.overrides} custom metadata records. {audit.note}</p>{audit.warnings.length?<ul>{audit.warnings.map((warning,i)=><li key={i}><strong>{warning.page}</strong>: {warning.message}</li>)}</ul>:<p>No override warnings found.</p>}</>}</section>;
}
