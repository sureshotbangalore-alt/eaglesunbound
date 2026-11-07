// Homepage blocks below the hero. The CMS stores an ordered list with a visible flag; unknown or missing blocks fall back to the default order.
export const HOME_SECTIONS: { id: string; label: string }[] = [
  { id: 'experience', label: 'The experience (intro and big image)' },
  { id: 'briefing', label: 'Field briefing' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'activities', label: 'Activities' },
  { id: 'founder', label: 'Founder' },
  { id: 'film', label: 'Film / video band' },
  { id: 'why', label: 'Why the outdoors' },
  { id: 'clients', label: 'Clients' },
];

export type SectionSetting = { id: string; visible?: boolean };

/** Full ordered list (saved order first, then any blocks not yet saved) with visibility applied. */
export function homeSettings(saved: SectionSetting[] | undefined): { id: string; visible: boolean }[] {
  const known = new Set(HOME_SECTIONS.map(s => s.id));
  const list = (saved || []).filter(s => known.has(s.id)).map(s => ({ id: s.id, visible: s.visible !== false }));
  const seen = new Set(list.map(s => s.id));
  return [...list, ...HOME_SECTIONS.filter(s => !seen.has(s.id)).map(s => ({ id: s.id, visible: true }))];
}

export const homeSections = (saved: SectionSetting[] | undefined) => homeSettings(saved).filter(s => s.visible).map(s => s.id);
