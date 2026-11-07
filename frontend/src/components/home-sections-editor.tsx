'use client';
import { HOME_SECTIONS, homeSettings, type SectionSetting } from '@/lib/home-sections';

/** Show/hide and reorder the homepage blocks that appear below the hero. Saved with the homepage form. */
export function HomeSectionsEditor({ value, onChange }: { value: SectionSetting[] | undefined; onChange: (next: { id: string; visible: boolean }[]) => void }) {
  const list = homeSettings(value);
  const label = (id: string) => HOME_SECTIONS.find(s => s.id === id)?.label || id;
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= list.length) return; const next = [...list];[next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  return <fieldset className="span-2 section-editor">
    <legend>Homepage sections</legend>
    <p className="admin-description">Choose which sections appear below the hero and in what order. Press Save homepage to publish the change.</p>
    <ol>{list.map((s, i) => <li key={s.id} className={s.visible ? '' : 'is-hidden'}>
      <label className="consent"><input type="checkbox" checked={s.visible} onChange={e => onChange(list.map(x => x.id === s.id ? { ...x, visible: e.target.checked } : x))}/> <span>{label(s.id)}</span></label>
      <span className="record-actions">
        <button type="button" aria-label={`Move ${label(s.id)} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
        <button type="button" aria-label={`Move ${label(s.id)} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
      </span>
    </li>)}</ol>
  </fieldset>;
}
