'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConsent } from './cookie-consent';
import { needsMediaConsent } from '@/lib/consent';
import { Pause, Play } from 'lucide-react';
import { useMotionPaused } from '@/lib/motion-preference';
import { usePageLoaded } from '@/lib/page-loaded';
export function HeroMedia({ video: custom }: { video: string }) {
  const { ready, preferences, openPreferences } = useConsent();
  const [origin,setOrigin] = useState('');
  const [size,setSize] = useState<'540'|'720'|'1080'>('720');
  const pageLoaded = usePageLoaded();
  const motionPaused = useMotionPaused();
  useEffect(()=>{setOrigin(location.origin);const w=window.innerWidth*Math.min(window.devicePixelRatio||1,2);setSize(window.innerWidth<=768?'540':w>=2200?'1080':'720');},[]);
  // Default: the bundled Eagles Unbound hero film (real footage, ~15 s loop). Phones get 540p, normal screens 720p and
  // only large/high-density screens the 1080p file. It starts downloading after the page has loaded.
  // A video URL set in the CMS (Homepage → hero video) still takes priority.
  const video = custom || `/assets/video/hero-film-${size}.mp4`;
  const allowed = ready && origin && (!needsMediaConsent(video,origin) || preferences.functional);
  const ref = useRef<HTMLVideoElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [host,setHost] = useState<Element|null>(null);
  useEffect(()=>setHost(anchor.current?.closest('.home-hero') || null),[]);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    let inView=false;const start=()=>{if(inView&&allowed&&!motionPaused&&!document.hidden)el.play().then(()=>setPlaying(!el.paused)).catch(()=>setPlaying(false));};
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(!inView){el.pause();setPlaying(false);}else start();},{threshold:0.1});
    observer.observe(el);
    const onVisibility=()=>{if(document.hidden){el.pause();setPlaying(false);}else start();};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);};
  },[video,allowed,motionPaused,pageLoaded]);
  const controls = video && host ? createPortal(allowed ? <button type="button" className="video-toggle" aria-label={playing ? 'Pause background video' : 'Play background video'} onClick={async () => { if(playing){ref.current?.pause();setPlaying(false);}else{try{await ref.current?.play();setPlaying(!ref.current?.paused);}catch{setPlaying(false);}} }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button> : <button className="video-toggle" type="button" onClick={openPreferences} aria-label="Manage video privacy settings"><Play size={16}/></button>,host) : null;
  return <><span ref={anchor} hidden/><Image src="/assets/video/hero-film-poster.webp" alt="A participant rappelling down a granite rock face at Eagles Unbound" fill priority sizes="100vw" className="hero-image"/>{video && allowed && pageLoaded && <video className="hero-video" ref={ref} src={video} muted loop playsInline preload="auto" aria-label="Eagles Unbound film: rappelling, zip line, obstacle nets, rope bridge, archery, climbing, the range, a summit trek and a campfire"/>}{controls}</>;
}
