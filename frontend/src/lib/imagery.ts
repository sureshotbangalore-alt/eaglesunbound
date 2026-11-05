// Interim imagery until approved Eagles Unbound photography arrives. Every image is labelled on the page.
// Sources: docs/media-provenance.md. "ai" marks AI-generated concept images; the rest are Unsplash photographs.
export type Picture = { src: string; alt: string; ai?: boolean };

export const img = {
  dawn: { src: '/assets/karnataka-dawn.jpg', alt: 'AI-generated concept of Karnataka granite hills at dawn', ai: true },
  wall: { src: '/assets/team-challenge.jpg', alt: 'AI-generated concept of a South Indian group helping each other over an obstacle wall', ai: true },
  heroTeam: { src: '/assets/hero-team.jpg', alt: 'A group of friends trekking up a green hillside' },
  granite: { src: '/assets/granite-hills.jpg', alt: 'Granite hills and scrub forest in Karnataka' },
  forest: { src: '/assets/forest-road.jpg', alt: 'A quiet forest road under tall trees' },
  camp: { src: '/assets/tents-dusk.jpg', alt: 'Tents pitched on a hillside at dusk' },
  rope: { src: '/assets/rope-course.jpg', alt: 'A young man in a harness crossing a high rope course' },
  climb: { src: '/assets/climbing-wall.jpg', alt: 'A climber in a helmet scaling a climbing wall' },
  students: { src: '/assets/students.jpg', alt: 'Young students with backpacks smiling together outdoors' },
  schools: { src: '/assets/schools.jpg', alt: 'A group of schoolgirls standing together outdoors' },
  kids: { src: '/assets/kids.jpg', alt: 'Children playing together on an open grass field' },
  trek: { src: '/assets/trek-team.jpg', alt: 'A line of trekkers climbing a mountain meadow' },
  cheer: { src: '/assets/cheer.jpg', alt: 'Friends raising their arms on a hilltop' },
  campfire: { src: '/assets/campfire.jpg', alt: 'A person beside a campfire at night' },
  ghats: { src: '/assets/ghats.jpg', alt: 'Rolling green hills under monsoon clouds' },
  forestWalk: { src: '/assets/forest-walk.jpg', alt: 'A group walking together along a forest trail' },
} satisfies Record<string, Picture>;

export const imageLabel = (p: Picture) => (p.ai ? 'AI-generated concept image' : 'Illustrative photograph');

const legacy = ['/assets/forest.jpg', '/assets/landscape.jpg', '/assets/camp.jpg'];

/** Programmes still pointing at placeholder files get an image that matches their audience. */
export function programmeImage(slug: string, image?: string): Picture {
  if (image && !legacy.includes(image)) return { src: image, alt: '' };
  if (/corporate/.test(slug)) return slug.includes('building') ? img.cheer : img.wall;
  if (/student|outbound/.test(slug)) return img.students;
  if (/school/.test(slug)) return img.schools;
  if (/college/.test(slug)) return img.trek;
  if (/overnight|stay/.test(slug)) return img.camp;
  if (/adventure-unbound/.test(slug)) return img.heroTeam;
  return img.forestWalk;
}

/** Activities have no photography yet; pick by what the activity is. */
export function activityImage(name: string): Picture {
  if (/zip|rope|bridge|burma|commando/i.test(name)) return img.rope;
  if (/climb|wall|rappel|ladder/i.test(name)) return img.climb;
  if (/obstacle|snake|army|race|tyre|tire|crawl/i.test(name)) return img.wall;
  if (/camp|fire|night|stay/i.test(name)) return img.campfire;
  if (/trek|walk|hike|nature|trail/i.test(name)) return img.forestWalk;
  if (/team|group|mind|tug/i.test(name)) return img.cheer;
  return img.ghats;
}

export const categoryImage: Record<string, Picture> = {
  'Adventure And Obstacle Activities': img.wall,
  'Camping And Overnight Experiences': img.camp,
  'Indoor Games': img.students,
  'Kids Special Experiences': img.kids,
  'Military-inspired Group Challenges': img.wall,
  'Nature And Wildlife': img.forest,
  'Outdoor Sports And Games': img.cheer,
  'Shooting And Archery': img.granite,
  'Team Building And Group Activities': img.cheer,
  'Water And Recreation': img.ghats,
  'Team & obstacles': img.wall,
  'Heights & ropes': img.rope,
  'Aim & focus': img.granite,
  'The outdoors': img.forestWalk,
};
