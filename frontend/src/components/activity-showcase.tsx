import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ContentRecord } from '@/lib/api';
import { activityImage } from '@/lib/imagery';


export function ActivityShowcase({ activities }: { activities: ContentRecord[] }) {
  return <div className="activity-index">{activities.slice(0, 7).map((a, i) => <article key={a.id} data-reveal data-preview={a.image || activityImage(a.name).src}>
    <span className="ai-num">0{i + 1}</span>
    <div className="ai-body"><h3><Link href={`/activities/${a.slug}`}>{a.name}</Link></h3><p>{a.description}</p><Link className="ai-enquire" href={`/book-now?activity=${encodeURIComponent(a.name)}`}>Enquire about this activity ↗</Link></div>
    <Link className="ai-go" aria-label={`Explore ${a.name}`} href={`/activities/${a.slug}`}><ArrowUpRight size={22}/></Link>
  </article>)}</div>;
}
