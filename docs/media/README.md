# Eagles Unbound media: what is on the website and where it came from

Source folder: `Downloads\website images\website images` (206 files, 6.94 GB: 121 photos, 76 videos, 9 RAW .CR2).
Originals are never modified and are not copied into the repository; the folders there are already organised by activity
and act as the source archive.

## What was reviewed

Every file was inspected (contact sheets per folder, a frame from every video). The folder names matched the content, so
they map directly onto the site's categories:

| Website group | Source folders | Notes |
|---|---|---|
| Bootcamp & obstacles | Group obstacle race, Individual obstacles, progressive group task, group photos (instructors in camouflage) | Strongest material: net climb, wall scaling with instructors, PGT plank crossings |
| Ropes & heights | zip line, highrope course, low rope course, wall climbing, Rapelling, caving | Rappelling on a granite face and the zip line are the hero shots |
| The range | archery, Shooting | Full-draw archery and air-rifle aiming, with coaching |
| Teams & schools | team building games, breifing, group photos, mud obstacles | Corporate and school groups |
| Outdoors & nights | Trekking, camp fire, tent pitching, rain dance | Summit vista from video; campfire at night |
| Stay & dining | luxurious Tent stay, having food | Real tent exteriors and interiors, bamboo cottage, dining hall |
| Farm & crafts | pottery, dairy farming, kitchen garden, tractor ride | Mostly school visits |

Not used: RAW .CR2 files (browsers cannot show them; JPEGs of the same sessions exist), near-duplicates, frames with
motion blur, and four files whose names suggest AI-enhanced copies of real photos ("High-Ropes Adventure Bridge…",
"Rope Bridge Adventure…", "Tropical Park…", "Children Climbing the Yellow Rope"). The original camera photos were used
instead.

## On the website

| Asset | Files | Size |
|---|---|---|
| Hero film (14.7 s, 10 real shots, graded, crossfades) | `assets/video/hero-film-1080.mp4` / `.webm`, `hero-film-540.mp4` (phones), `hero-film-poster.webp/.jpg` | 4.0 MB / 3.6 MB / 1.3 MB / 0.25 MB |
| Inner-page header loops (Bootcamp, Activities, About) | `assets/video/loop-*.mp4` (720p) | 0.76–0.90 MB each |
| Photographs (52, WebP, max 1800 px, quality 76) | `media/photos/*.webp`, list in `photo-manifest.json` | 14.6 MB total |
| Activity motion graphic, Shooting Academy and eagle films | `assets/video/motion/*` (rendered in code) | 0.1–0.5 MB each |

Storage comparison:

- Photographs: the 52 selected originals are 302 MB → 14.4 MB as WebP (95% smaller). Next.js `<Image>` then serves smaller
  responsive sizes and modern formats per device, and lazy-loads everything below the fold.
- Video: the 14 source clips used total 1.33 GB → 12 MB of web video (hero film in three encodes plus three loops), 99% smaller.
- Removed from the site after checking nothing references them: 16 stock/AI placeholder photos and the old dawn hero
  loops (8.4 MB), and the retired `activity-lines` film. `forest.jpg`, `landscape.jpg` and `camp.jpg` are kept because
  live programme records still point at them until the media command below is run.

## Keeping it editable in the CMS

- Activities and programmes: their **Image** field in the admin panel still wins. Records without an image show the
  matching real photograph automatically (`frontend/src/lib/imagery.ts`).
- To store those photographs in the database as well (so admins see and can replace them in the editor), run:
  - Preview, no writes: `npm run db:apply-media -- --dry-run`
  - Apply: `ALLOW_DB_WRITES=true npm run db:apply-media -- --confirm-database=<exact database name>`

  It only fills empty or placeholder images (never an image an admin chose) unless `--overwrite` is given.
  Against the live list it matches 62 of 70 activities and all 9 programmes; cricket, football, volleyball, chess, carom,
  ATV and swimming pool have no footage in the folder.
- Hero video: Homepage → hero video in the admin panel overrides the bundled film.

## Rebuilding

- Photos: `python scripts/optimise-photos.py "<source folder>"`
- Hero film: `python scripts/build-hero-film.py "<source folder>"`; header loops: add `--loops`
- Motion graphics: `node scripts/render-motion.mjs [scene]`

## Still needed for an even better result

- A high-resolution or vector (SVG) logo: the current logo is 266×102 px and softens when shown large in the intro.
- Footage for cricket, football, volleyball, ATV and the swimming pool, and a higher-resolution founder portrait (current: 447×447).
- Optional: a licensed music track if the hero film should have sound (it would start muted, with an unmute button).

## Gallery clips (Activities page, #gallery)

Ten single-shot silent clips (720p, ~5 s, ~0.7 MB each, 6.8 MB total) with WebP posters in `media/clips/`, built by
`python scripts/build-gallery-clips.py`. Tiles preview on hover/focus only; the full-screen viewer plays them with controls.
`/gallery` keeps its permanent redirect to `/activities` (the gallery lives there).

## Visitor feedback & testimonials

- Public form: `/feedback` (also linked from the home "Visitor voices" section and the header "More" menu).
- Stored in the new `visitor_feedback` table, always as Pending. Super Admin reviews it in Admin → Feedback
  (approve & publish, reject, back to pending, public name, private notes, delete). Staff Viewers have no access.
- Only feedback that is Approved AND whose author ticked "you may publish" appears publicly, as first name + initial.
  Email addresses and notes are never public. No sample or invented reviews exist.
- **Enable on Hostinger:** run `backend/schema/migrations/2026-11-07-visitor-feedback.sql` once (phpMyAdmin → SQL).
  It only creates the new table. Until then the site works normally, shows no testimonials, and the form says feedback is
  not available yet; `npm run db:check` lists it as a notice, not a failure.

## Activity clean-up (proposal, not applied)

`npm run db:tidy-activities` previews unpublishing the 35 duplicates and non-activities listed in
`docs/activities-review.md` (it never deletes). Apply only after review:
`ALLOW_DB_WRITES=true npm run db:tidy-activities -- --apply --confirm-database=<exact database name>`.
