'use client';
import { useSyncExternalStore } from 'react';
function subscribe(change:()=>void) {
  const query=window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new MutationObserver(change);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-adventure-motion']});
  query.addEventListener('change',change);
  return ()=>{observer.disconnect();query.removeEventListener('change',change);};
}
function snapshot(){return document.documentElement.dataset.adventureMotion==='paused'||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function useMotionPaused(){return useSyncExternalStore(subscribe,snapshot,()=>true);}
