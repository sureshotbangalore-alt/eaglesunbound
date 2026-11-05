# Current motion implementation

The original vector draft described below has been superseded by the Three.js/Anime.js adventure world. See `master-gap-audit.md` for the current scene, content comparison and verification limits. SVG remains only for lightweight supporting illustrations.

# Motion storyboard and implementation

The existing site used one photograph, upward section reveals, staggered programme cards and a static activity list. The database, forms, authentication and SEO remain in place. No new animation library or generated raster image is needed: this release uses original layered SVG, CSS timelines, the existing Motion dependency and the Web Animations API.

## Directed sequence

1. **Opening, 0–0.65s:** a dark curtain clears the hero. The landscape remains a poster, not purported action footage.
2. **Depth, 0.6–1.5s:** the original vector obstacle environment opens through a mask; mountain and foreground layers settle separately.
3. **Headline, 0.9–2.2s:** the HTML headline enters with a short word stagger. The CMS text remains editable.
4. **Character action, 1.5–3.4s:** separately articulated arm groups reach, legs bend and step, the torso rises and a teammate extends an arm. The rope settles after the action. This is vector joint animation, not a translated still. Replay restarts this finite sequence.
5. **Conversion, 1.8–3.2s:** supporting text and real booking/explore links enter. Controls remain ordinary links and buttons.
6. **Leaving the hero:** scroll changes landscape depth and raises the headline slightly; a foreground terrain edge connects the next section. Native scrolling is retained.
7. **Bootcamp:** one desktop sticky sequence advances through Prepare, Challenge, Collaborate and Overcome. The route draws with scroll; the illustrated participant and helpers change articulated poses. This communicates the concept, not an actual programme schedule. Mobile and reduced-motion views show all four chapters in normal flow.
8. **Programmes:** selecting a tab changes the visual, heading, description, detail link, count and progress. Touch swipes and previous/next controls provide the same actions. Only published database programmes are selectable. Separate bootcamp and group/family links use existing real destinations.
9. **Activities:** a touch/keyboard-scrollable filmstrip includes detail and enquiry links. Rope, climbing and archery concept illustrations react on hover/focus. Illustrations are labelled and are not presented as client photographs.
10. **Gallery and finish:** native media dialogs have keyboard and touch navigation, a short entrance and actual video controls. The closing booking section uses a panoramic landscape treatment.

## Boundaries and fallback

- The original official logo is unchanged.
- No approved client video, layered character artwork, frame sequence, Lottie or Rive file was available. The original SVG scene is an illustrative design asset. For a photorealistic action hero, supply approved footage or a production animation with layers/rigs; the image poster is not described as moving human footage.
- No random particle field, spinning emblem, WebGL canvas or scroll-hijacking library is used in the rendered scene.
- Public motion is isolated from admin. The global pause control cancels managed entrances, stops CSS animation and switches the long story to natural flow. OS reduced-motion preference also disables scene motion. Programme controls remain functional with immediate transitions.
- Animation handlers, observers and requestAnimationFrame callbacks clean up on route changes. Core text and links are server-rendered. Without JavaScript the complete bootcamp copy appears in normal flow and catalogue listing routes remain available.

## Verification

Run TypeScript, the production build, backend regression tests and the read-only route check. Browser access to localhost remains denied by a saved app permission, so desktop/mobile screenshots, real motion inspection, FPS, layout shift and browser interaction measurements cannot be claimed in this session. The Playwright suite includes motion-specific checks for an authorised follow-up run.
