'use client';
import { useEffect, useRef } from 'react';
export function Modal({children,label,onClose}:{children:React.ReactNode;label:string;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();return ()=>el?.close();},[]);
  return <dialog ref={ref} className="admin-modal" aria-label={label} onCancel={e=>{e.preventDefault();onClose();}}>{children}</dialog>;
}
