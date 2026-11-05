'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
export function HeroMedia({ video }: { video: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting){el.pause();setPlaying(false);}},{threshold:0.1});
    observer.observe(el);
    const onVisibility=()=>{if(document.hidden){el.pause();setPlaying(false);}};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);};
  },[video]);
  return <><Image src="/assets/karnataka-dawn.jpg" alt="AI-generated Karnataka granite hills at dawn; concept landscape" fill priority sizes="100vw" className="hero-image" />{video && <><video className="hero-video" ref={ref} src={video} poster="/assets/karnataka-dawn.jpg" muted loop playsInline preload="none" aria-label="Eagles Unbound experience film" /><button className="video-toggle" aria-label={playing ? 'Pause background video' : 'Play background video'} onClick={async () => { if (playing) ref.current?.pause(); else await ref.current?.play().catch(() => {}); setPlaying(!ref.current?.paused); }}>{playing ? <Pause size={16} /> : <Play size={16} />}</button></>}</>;
}
