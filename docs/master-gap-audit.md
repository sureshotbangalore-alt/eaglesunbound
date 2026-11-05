> Current design: the latest clean-editorial revision removes the animated-world presentation while preserving content, functionality and exact dependency locks. See `docs/quiet-redesign.md` (or `quiet-redesign.md` within this docs folder). Earlier animation details below describe the prior stage.

# Master brief comparison and implementation

Source: the user-supplied **37-page Eagles Unbound Master Website Development Prompt**. It references a separate 27-page activity brochure and five-page 2026 programme brochure; those two originals were not supplied in this chat. The requested existing Next.js/FastAPI stack is preserved. Three.js and Anime.js were added explicitly at the user's request and pinned to exact versions.

## Gaps filled

| Brief requirement | Implementation |
| --- | --- |
| Complete activity inventory | All 71 distinct source names across ten categories are retained in `backend/app/data/master-activities.json` and imported centrally. Cross-category duplicates and existing obstacle aliases share records. Three additional names from the school programme are also captured. |
| Existing and additional offerings | Runtime catalogue has 75 activity records: 70 public and five terminology/operational-review drafts. The six detailed programmes are added alongside the three existing published programme collections. The existing bootcamp record remains draft. |
| Activity discovery | Search, source categories, audience filtering, details and enquiry links; no duplicated detail pages for repeated category entries. |
| Six programmes | School Day Outing; Outbound Student Activities; College Adventure Program; Overnight Stay Program; Corporate Team Building; Outdoor Adventure Program. |
| Programme detail information | Audience, descriptions, highlights, activity discussion list, associated published activities and programme-specific menus. Original reported times, group minimums and eligibility are retained for client review rather than asserted as current operating facts. |
| Audience pages | Kids Experiences; Schools & Colleges; Corporate. School and college programme detail routes provide separate institutional destinations. |
| Founder | Dedicated editable Founder page, homepage introduction, supplied name/designation. No invented portrait or career timeline. Extended service/award claims are held for review. |
| Accommodation | Camping/overnight enquiry page and integration with the overnight programme. Tents/rooms and unverified amenities are discussed without asserting operational facilities. |
| Dining | Programme-linked breakfast, lunch, hi-tea and dinner options, with explicit menu/inclusion confirmation and dietary enquiry fields. |
| Testimonials | Dedicated public route; optional author, quote and video fields under client management; publication requires both a published client record and explicit testimonial approval. The API also suppresses unapproved quotations. |
| Gallery structure | Twelve source gallery categories are seeded as draft albums, awaiting genuine media. Existing lightbox, keyboard/swipe and video handling remain. |
| Homepage scope | Primary tagline, mission/audience selector, founder introduction, video-ready experience-film section and interactive illustrative 3D explorer added to the existing story, programmes, activities, clients, gallery and final CTA. |
| Mission selector | Audience → experience → duration → suggestions from published database programmes → contextual enquiry. No availability is automatically confirmed. |
| Enquiry information | Organisation, visitor category, programme interest, date, participants, vegetarian/non-vegetarian counts and special requirements persist in PostgreSQL-compatible JSON columns. Added migration preserves prior records. |
| Bootcamp outline | Four interactive story chapters plus the seven suggested planning stages. Neither is presented as an operational itinerary or official military training. |
| Navigation and SEO | New destinations linked in header/footer, appropriate redirects, metadata and sitemap. Published catalogue records remain server-rendered/indexable when production indexing is enabled. |
| Version stability | Existing tested runtime versions retained; exact Three.js 0.187.0, Anime.js 4.5.0 and @types/three 0.187.0 added to package/lock files. Existing Python lock and immutable container image digests retained. |

## Animation rework

The small schematic hero was replaced by an original Three.js adventure environment: timber platforms, planked suspension bridge, hanging ropes, overhead tether, climbing wall/holds, a zipline, a physical target, bow and arrow, instanced trees, elevated procedural terrain, lighting and shadows. Nine experience themes expose linked published activities without inventing geographic zone locations. The participant is a hierarchy of torso, hips, knees, shoulders, elbows, hands and boots. Anime.js drives the rig clock, while the camera eases between activity views and responds gently to pointer position.

Rope crossing uses a return/turn cycle, climbing has ascent/descent, and zipline/archery sequences end until replayed. Controls allow scene selection, replay and pause. Rendering pauses outside the viewport or hidden tab; geometry, materials, observers and frame callbacks are disposed when replaced. Code is dynamically imported near the viewport, device pixel ratio is bounded, mobile shadows are disabled and reduced-motion users receive a still scene. A WebGL fallback keeps information and enquiry links available.

This is explicitly an **illustrative adventure environment**, not verified park geography or documentary footage. The official logo has not been redrawn or modified. No synthetic face is presented as the founder or a customer.

## Information preserved for approval

These are visible to authorised administrators in **Settings → Master brief: client confirmations** and in draft catalogue records:

- Current site number `7259307111` conflicts with brochure-reported `8248333506`. Existing public contact is preserved pending confirmation. WhatsApp/email/social links remain hidden if unconfigured.
- Unusual source wording `Pelvic Rest Shooting` and `Recove Bow Shooting`, plus `.22 Rifle Shooting`, `Standing Shooting` and `Target Practice`, remain draft until terminology and operations are confirmed.
- Reported 08:00–17:00 school timing, sixth-standard eligibility, selected 100-person minimums and two-day/one-night outline are retained in the original programme data and review panel. They are not silently turned into restrictions for all bookings.
- All menu examples and source activity lists are retained with each programme. Public menus explicitly require confirmation and do not imply every dish is included in every package.
- Founder award/service statements, official portrait, biography, milestones and message require the original approved material.
- Luxury tent and guest-room amenities, air conditioning, attached washrooms, hot water and sit-out facilities require operational verification and original photography.
- The advance percentage, final-headcount, weather-change, damage-charge and dietary notification clauses are retained privately for legal/business approval. No online payment gateway or public price/rate/discount figures were added.
- Real participant testimonials, approved client logos, original event photographs, videos, accommodation media, approved eagle GLB/layered artwork and verified park-zone locations are still required. Empty states and upload/integration points remain accurate.

## Checks and remaining release gates

TypeScript and production build checks, version consistency, dependency compatibility, migration drift, API regressions and HTTP route/CMS checks are run separately. The API suite includes catalogue completeness/idempotence, meal validation and protection of unapproved review content.

Browser access to localhost is denied by a saved app permission. Consequently WebGL rendering quality, actual animation movement, screenshots, browser console, mobile overflow, FPS and Lighthouse are **not verified here**. The updated Playwright suite is provided but its discovery is not represented as execution. Docker/PostgreSQL execution also remains unverified because Docker is unavailable. Those checks, approved original media and the unresolved business facts are required before calling this production signed-off.

The local Git repository and staged lockfiles are prepared. The requested commit is waiting for the user's Git author name and email; no identity or remote push has been invented.


Latest HTTP audit: 128 checked URLs/assets, zero broken URLs, four verified redirects and zero metadata/link warnings. This is HTTP verification, not a browser/WebGL rendering test.
