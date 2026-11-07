'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { Brand } from './brand';
const links = [['The Bootcamp', '/the-bootcamp'], ['What We Offer', '/what-we-offer'], ['Activities', '/activities'], ['About', '/about'], ['Contact', '/contact']];
const more: [string, string[][]][] = [['Plan your visit', [['Stay & Dining','/food-and-dining'],['Our Founder','/founder'],['FAQs','/contact#faqs']]]];
export function Header() {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDetailsElement>(null);
  // Close the "More" panel on outside click or Escape.
  useEffect(() => {
    const close = (e: Event) => { const d = moreRef.current; if (d?.open && (e.type === 'keydown' ? (e as KeyboardEvent).key === 'Escape' : !d.contains(e.target as Node))) d.open = false; };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);
  const navRef=useRef<HTMLElement>(null);
  const buttonRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setOpen(false);buttonRef.current?.focus();}
      if(e.key==='Tab'){
        const items=[...(navRef.current?.querySelectorAll<HTMLElement>('a,summary')||[]),buttonRef.current!].filter(Boolean);
        const index=items.indexOf(document.activeElement as HTMLElement);
        if(e.shiftKey&&index===0){e.preventDefault();items[items.length-1].focus();}
        else if(!e.shiftKey&&index===items.length-1){e.preventDefault();items[0].focus();}
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);};
  },[open]);
  const path = usePathname();
  return <header className="site-header">
    <Link href="/" aria-label="Eagles Unbound home"><Brand /></Link>
    <nav ref={navRef} id="main-navigation" aria-label="Main navigation" className={open ? 'main-nav is-open' : 'main-nav'}>
      {links.map(([label, href], i) => <Link key={href} href={href} style={{ '--i': i } as React.CSSProperties} aria-current={path === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}<details ref={moreRef} className="nav-dropdown" style={{ '--i': links.length } as React.CSSProperties}><summary>More</summary><div>{more.map(([group, items]) => <section key={group} className="nav-group"><p>{group}</p>{items.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} onClick={() => { setOpen(false); if (moreRef.current) moreRef.current.open = false; }}>{label}</Link>)}</section>)}</div></details>
    </nav>
    <Link className="button button-red header-book" href="/book-now">Book now <ArrowUpRight size={16} /></Link>
    <button ref={buttonRef} aria-controls="main-navigation" className="menu-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </header>;
}
