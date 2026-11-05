import { redirect, notFound } from 'next/navigation';
export default async function MergedDetail({params}:{params:Promise<{section:string;slug:string}>}){
const {section,slug}=await params;
if(section==='activities')redirect('/activities#'+encodeURIComponent(slug));
if(section==='programmes')redirect('/what-we-offer#'+encodeURIComponent(slug));
if(section==='packages')redirect('/what-we-offer');
notFound();
}
