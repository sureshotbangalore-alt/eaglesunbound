import type { Metadata } from 'next';
import './globals.css';
import './design-refinements.css';

import './shared-interactions.css';
import './premium.css';
import './motion.css';
import './field.css';
import './imagery.css';
import './tactical.css';
import './staff.css';
import './inner-pages.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'Eagles Unbound — Adventure with Purpose', template: '%s | Eagles Unbound' },
  description: 'Explore military-inspired civilian outdoor challenges, corporate team experiences and student adventure programmes near Kanakapura Road, Bengaluru.',
  openGraph: { title: 'Eagles Unbound — The Challenge Starts Here', description: 'Adventure, teamwork and the outdoors. Discover your next challenge.', images: ['/assets/eagles-unbound-logo.png'], type: 'website' },
};
// Enables scroll choreography before first paint; falls back to static content if the engine never starts.
const FX_BOOT = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('fx');setTimeout(function(){if(!d.classList.contains('fx-ready'))d.classList.remove('fx')},3500)}catch(e){}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: FX_BOOT }}/></head><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
