'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConsent } from './cookie-consent';
import { needsMediaConsent } from '@/lib/consent';
import { Pause, Play } from 'lucide-react';
export function HeroMedia({ video }: { video: string }) {
  const { ready, preferences, openPreferences } = useConsent();
  const [origin,setOrigin] = useState('');
  useEffect(()=>setOrigin(location.origin),[]);
  const allowed = ready && origin && (!needsMediaConsent(video,origin) || preferences.functional);
  const ref = useRef<HTMLVideoElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [host,setHost] = useState<Element|null>(null);
  useEffect(()=>setHost(anchor.current?.closest('.home-hero') || null),[]);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting){el.pause();setPlaying(false);}},{threshold:0.1});
    observer.observe(el);
    const onVisibility=()=>{if(document.hidden){el.pause();setPlaying(false);}};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);};
  },[video,allowed]);
  const controls = video && host ? createPortal(allowed ? <button type="button" className="video-toggle" aria-label={playing ? 'Pause background video' : 'Play background video'} onClick={async () => { if(playing){ref.current?.pause();setPlaying(false);}else{try{await ref.current?.play();setPlaying(!ref.current?.paused);}catch{setPlaying(false);}} }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button> : <button className="video-toggle" type="button" onClick={openPreferences} aria-label="Manage video privacy settings"><Play size={16}/></button>,host) : null;
  return <><span ref={anchor} hidden/><Image src="/assets/karnataka-dawn.jpg" alt="AI-generated Karnataka granite hills at dawn; concept landscape" fill priority sizes="100vw" className="hero-image"/>{video && allowed && <video className="hero-video" ref={ref} src={video} poster="/assets/karnataka-dawn.jpg" muted loop playsInline preload="none" aria-label="Eagles Unbound experience film"/>}{controls}</>;
}
