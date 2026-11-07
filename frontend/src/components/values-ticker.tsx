import { Shield, Users, Crosshair, Mountain, Trees, Flag, Compass, Handshake, type LucideIcon } from 'lucide-react';

const VALUES: [string, LucideIcon][] = [
  ['Courage', Shield], ['Teamwork', Users], ['Discipline', Crosshair], ['Resilience', Mountain],
  ['The outdoors', Trees], ['Leadership', Flag], ['Adventure', Compass], ['Trust', Handshake],
];

/** Army-style values band under the home hero: stencil lettering with icons, scrolling continuously. */
export function ValuesTicker() {
  const row = (copy: number) => (
    <span className="vt-run" key={copy}>
      {VALUES.map(([name, Icon]) => (
        <span className="vt-item" key={name}><span className="vt-badge"><Icon size={20} strokeWidth={1.8} /></span><span className="vt-word">{name}</span><span className="vt-star">★</span></span>
      ))}
    </span>
  );
  return (
    <div className="vt">
      <p className="sr-only">Our values: {VALUES.map(v => v[0]).join(', ')}.</p>
      <div className="vt-tape" aria-hidden="true" />
      <div className="vt-window" aria-hidden="true"><div className="vt-track">{[0, 1].map(row)}</div></div>
      <div className="vt-tape" aria-hidden="true" />
    </div>
  );
}
