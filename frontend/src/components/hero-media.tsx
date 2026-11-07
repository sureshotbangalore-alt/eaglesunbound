'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConsent } from './cookie-consent';
import { needsMediaConsent } from '@/lib/consent';
import { Pause, Play } from 'lucide-react';
import { useMotionPaused } from '@/lib/motion-preference';
export function HeroMedia({ video: custom }: { video: string }) {
  const { ready, preferences, openPreferences } = useConsent();
  const [origin,setOrigin] = useState('');
  const [small,setSmall] = useState(false);
  const motionPaused = useMotionPaused();
  useEffect(()=>{setOrigin(location.origin);setSmall(window.innerWidth<=768);},[]);
  // Default: the bundled 8-second loop (slow camera push over the dawn landscape). A CMS video URL still takes priority.
  const video = custom || `/assets/video/hero-dawn-loop-${small?'720':'1280'}.mp4`;
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
  },[video,allowed,motionPaused]);
  const controls = video && host ? createPortal(allowed ? <button type="button" className="video-toggle" aria-label={playing ? 'Pause background video' : 'Play background video'} onClick={async () => { if(playing){ref.current?.pause();setPlaying(false);}else{try{await ref.current?.play();setPlaying(!ref.current?.paused);}catch{setPlaying(false);}} }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button> : <button className="video-toggle" type="button" onClick={openPreferences} aria-label="Manage video privacy settings"><Play size={16}/></button>,host) : null;
  return <><span ref={anchor} hidden/><Image src="/assets/karnataka-dawn.jpg" alt="AI-generated Karnataka granite hills at dawn; concept landscape" fill priority sizes="100vw" className="hero-image"/>{video && allowed && <video className="hero-video" ref={ref} src={video} poster="/assets/karnataka-dawn.jpg" muted loop playsInline preload="metadata" aria-label="Eagles Unbound experience film"/>}{controls}</>;
}
