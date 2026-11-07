// Eagles Unbound photography (real sessions at the venue). Originals live outside the repo; web copies are WebP files in
// public/media/photos, made by scripts/optimise-photos.py (see docs/media/photo-manifest.json for source -> file).
// These are defaults: an image set on a programme or activity in the CMS always takes priority.
export type Picture = { src: string; alt: string; ai?: boolean; real?: boolean };

const p = (key: string, alt: string): Picture => ({ src: `/media/photos/${key}.webp`, alt, real: true });

export const photos = {
  obstacleWall: p('obstacle-wall', 'Teammates hauling each other over the obstacle wall'),
  obstacleNet: p('obstacle-net', 'A group climbing the cargo net obstacle together'),
  obstacleRace: p('obstacle-race', 'Participants climbing the angled ladder obstacle'),
  obstacleHurdles: p('obstacle-hurdles', 'A participant vaulting the obstacle wall while the team waits'),
  armyInstructors: p('army-instructors', 'Instructors in camouflage guiding a team over the wall'),
  armyBriefing: p('army-briefing', 'Instructors in camouflage briefing a group in the field'),
  individualObstacles: p('individual-obstacles', 'The individual obstacle frame with ladders, steps and rope'),
  pgt: p('pgt', 'A team balancing planks across the Progressive Group Task'),
  pgtTeam: p('pgt-team', 'A team planning a crossing with planks and a log'),
  zipRider: p('zip-rider', 'A rider in a helmet flying down the zip line'),
  zipTeam: p('zip-team', 'A group in helmets and harnesses ready for the zip line'),
  highRope: p('high-rope', 'A participant crossing the high rope course among the trees'),
  ropeBridge: p('rope-bridge', 'A participant crossing the high rope bridge'),
  lowRope: p('low-rope', 'Students crossing the low rope course'),
  wallClimb: p('wall-climb', 'A climber scaling the climbing tower'),
  wallTower: p('wall-tower', 'Two climbers on the climbing tower'),
  rappel: p('rappel', 'Rappelling down a granite rock face'),
  caving: p('caving', 'Crawling through a rock cave passage'),
  archery: p('archery', 'An archer at full draw on the archery range'),
  archeryCoach: p('archery-coach', 'An instructor coaching an archer'),
  archeryLine: p('archery-line', 'Archers taking aim on the shooting line'),
  shooting: p('shooting', 'A participant aiming an air rifle'),
  shootingRange: p('shooting-range', 'Participants on the air rifle range'),
  shootingAim: p('shooting-aim', 'Taking careful aim on the air rifle range'),
  briefing: p('briefing', 'An instructor briefing students before the day begins'),
  briefingAssembly: p('briefing-assembly', 'Students assembling for the morning briefing'),
  teamGames: p('team-games', 'Teams playing a field game'),
  teamCircle: p('team-circle', 'A large group in a circle for a team game'),
  groupCorporate: p('group-corporate', 'A corporate group together after their day'),
  groupCheer: p('group-cheer', 'A team striking a pose together'),
  groupStudents: p('group-students', 'A large student group on the lawn'),
  groupKids: p('group-kids', 'Schoolchildren in helmets and harnesses'),
  groupFun: p('group-fun', 'A cheerful group on the lawn'),
  mudKids: p('mud-kids', 'Children climbing through the tyre and net obstacle'),
  mudNet: p('mud-net', 'Children climbing the rope net'),
  trekVista: p('trek-vista', 'Trekkers on a granite summit above the valley'),
  trekTrail: p('trek-trail', 'Trekkers walking down a rocky hillside'),
  campfire: p('campfire', 'A group around a roaring campfire at night'),
  campfireCircle: p('campfire-circle', 'A group sitting together on the lawn at night'),
  tentsNight: p('tents-night', 'Camping tents pitched on the lawn at night'),
  tentPitching: p('tent-pitching', 'An instructor demonstrating tent pitching'),
  rainDance: p('rain-dance', 'A group celebrating under the rain dance sprinklers'),
  tentStay: p('tent-stay', 'Luxury tents with private verandas'),
  tentInterior: p('tent-interior', 'Inside a luxury tent: double bed and wardrobe'),
  tentLounge: p('tent-lounge', 'Seating area inside a luxury tent'),
  tentRow: p('tent-row', 'A row of luxury tents among coconut palms'),
  cottage: p('cottage', 'A bamboo cottage with a veranda'),
  dining: p('dining', 'Students sharing a meal in the dining hall'),
  pottery: p('pottery', 'A child shaping clay on the potter’s wheel with the potter'),
  tractor: p('tractor', 'A tractor ride along the farm track'),
  dairy: p('dairy', 'Students feeding the farm animals'),
  garden: p('garden', 'Planting seedlings in the kitchen garden'),
} satisfies Record<string, Picture>;

/** Named slots used by page layouts. Each now points at a real Eagles Unbound photograph. */
export const img = {
  dawn: photos.trekVista,
  wall: photos.obstacleWall,
  heroTeam: photos.groupCorporate,
  granite: photos.rappel,
  forest: photos.trekTrail,
  camp: photos.tentsNight,
  rope: photos.highRope,
  climb: photos.wallClimb,
  students: photos.briefing,
  schools: photos.lowRope,
  kids: photos.mudKids,
  trek: photos.trekVista,
  cheer: photos.groupFun,
  campfire: photos.campfire,
  ghats: photos.trekTrail,
  forestWalk: photos.zipTeam,
} satisfies Record<string, Picture>;

export const imageLabel = (pic: Picture) => (pic.ai ? 'AI-generated concept image' : pic.real ? 'At Eagles Unbound' : 'Illustrative photograph');

const legacy = ['/assets/forest.jpg', '/assets/landscape.jpg', '/assets/camp.jpg'];

/** Programmes without their own CMS image get a real photograph that matches their audience. */
export function programmeImage(slug: string, image?: string): Picture {
  if (image && !legacy.includes(image)) return { src: image, alt: '' };
  if (/corporate/.test(slug)) return slug.includes('building') ? photos.teamGames : photos.groupCorporate;
  if (/student|outbound/.test(slug)) return photos.briefing;
  if (/school/.test(slug)) return photos.groupKids;
  if (/college/.test(slug)) return photos.obstacleNet;
  if (/overnight|stay/.test(slug)) return photos.tentStay;
  if (/adventure-unbound/.test(slug)) return photos.zipRider;
  if (/outdoor-adventure/.test(slug)) return photos.trekVista;
  return photos.groupFun;
}

/** Activities without their own CMS image: match the activity to the photograph of it. */
export function activityImage(name: string): Picture {
  const n = name.toLowerCase();
  const rules: [RegExp, Picture][] = [
    [/zip/, photos.zipRider], [/high rope|bridge|burma/, photos.highRope], [/low rope/, photos.lowRope],
    [/rappel/, photos.rappel], [/cav(e|ing)/, photos.caving], [/wall climb|climbing/, photos.wallClimb],
    [/arch/, photos.archery], [/rifle|shoot/, photos.shooting], [/progressive|pgt/, photos.pgt],
    [/snake|group obstacle|race/, photos.obstacleNet], [/mud|kids/, photos.mudKids], [/obstacle|army|commando/, photos.obstacleWall],
    [/tent|camping/, photos.tentsNight], [/campfire|bonfire/, photos.campfire], [/rain dance/, photos.rainDance],
    [/trek|hik|sunrise|walk|nature|bird/, photos.trekVista], [/pottery|clay|planter|lantern|name plate|figurine|traditional/, photos.pottery],
    [/dairy|cow|milk|animal|farm/, photos.dairy], [/garden|seed|herb|compost|soil/, photos.garden], [/tractor/, photos.tractor],
    [/tug|team|group|icebreaker|energi|leadership|mind|games|tournament/, photos.teamGames],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? photos.groupStudents;
}

export const categoryImage: Record<string, Picture> = {
  'Adventure And Obstacle Activities': photos.obstacleNet,
  'Camping And Overnight Experiences': photos.tentsNight,
  'Indoor Games': photos.groupStudents,
  'Kids Special Experiences': photos.mudKids,
  'Military-inspired Group Challenges': photos.armyInstructors,
  'Nature And Wildlife': photos.trekVista,
  'Outdoor Sports And Games': photos.teamCircle,
  'Shooting And Archery': photos.archery,
  'Team Building And Group Activities': photos.teamGames,
  'Water And Recreation': photos.rainDance,
  'Team & obstacles': photos.obstacleWall,
  'Heights & ropes': photos.highRope,
  'Aim & focus': photos.shooting,
  'The outdoors': photos.trekVista,
};

/** Field gallery on the Activities page, grouped the way visitors think about the day. */
export const galleryGroups: { name: string; pictures: Picture[] }[] = [
  { name: 'Bootcamp & obstacles', pictures: [photos.obstacleWall, photos.obstacleNet, photos.armyInstructors, photos.obstacleRace, photos.pgt, photos.obstacleHurdles, photos.pgtTeam, photos.individualObstacles] },
  { name: 'Ropes & heights', pictures: [photos.zipRider, photos.highRope, photos.rappel, photos.wallClimb, photos.ropeBridge, photos.wallTower, photos.lowRope, photos.caving] },
  { name: 'The range', pictures: [photos.archery, photos.shooting, photos.archeryCoach, photos.shootingAim, photos.archeryLine, photos.shootingRange] },
  { name: 'Teams & schools', pictures: [photos.teamGames, photos.groupCorporate, photos.briefing, photos.mudKids, photos.teamCircle, photos.groupKids, photos.mudNet, photos.groupCheer] },
  { name: 'Outdoors & nights', pictures: [photos.trekVista, photos.campfire, photos.tentsNight, photos.rainDance, photos.trekTrail, photos.tentPitching, photos.campfireCircle] },
  { name: 'Farm & crafts', pictures: [photos.pottery, photos.dairy, photos.garden, photos.tractor] },
];
