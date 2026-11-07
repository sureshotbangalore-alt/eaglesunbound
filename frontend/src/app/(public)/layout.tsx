import { ConsentProvider } from '@/components/cookie-consent';
import { ScrollFX } from '@/components/scroll-fx';
import { BattleFX } from '@/components/battle-fx';
import { IntroReveal, RouteWipe } from '@/components/cinematic';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { serverAPI, type ContactSettings } from '@/lib/api';
import { StructuredData } from '@/components/structured-data';
import { siteURL } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await serverAPI<ContactSettings>('/public/settings');
  const social=[settings.instagram,settings.facebook,settings.youtube].filter(Boolean);
  return <ConsentProvider><ScrollFX/><IntroReveal/><RouteWipe/><BattleFX/><Header />{children}<Footer settings={settings} /><StructuredData data={{'@context':'https://schema.org','@type':'LocalBusiness','@id':siteURL()+'/#business',name:'Eagles Unbound',url:siteURL(),telephone:settings.phone,address:{'@type':'PostalAddress',streetAddress:settings.address,addressLocality:'Bengaluru',addressRegion:'Karnataka',postalCode:'560082',addressCountry:'IN'},description:'Outdoor adventure and experiential learning with military-inspired civilian obstacle challenges.',...(social.length?{sameAs:social}:{})}}/></ConsentProvider>;
}
