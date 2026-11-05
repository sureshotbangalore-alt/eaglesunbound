import Link from 'next/link';
import { Compass, MapPin, ArrowUpRight } from 'lucide-react';
/** Compact orientation strip across public chapters, with useful onward navigation. */
export function PageWorld({path}:{path:string}) {
 const legal=/policy|terms-and/.test(path);
 return <div className={`page-orientation ${legal?'po-practical':''}`}>
   <span><Compass size={18}/>{legal?'VISITOR INFORMATION':'ADVENTURE WITH PURPOSE'}</span>
   <span><MapPin size={16}/>SOUTH BENGALURU, KARNATAKA</span>
   <Link href={legal?'/contact':'/mission-selector'}>{legal?'Ask a question':'Find your experience'}<ArrowUpRight size={16}/></Link>
 </div>;
}
