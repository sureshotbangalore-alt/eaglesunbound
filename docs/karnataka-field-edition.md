# Karnataka field edition

The homepage now uses a Karnataka landscape, drifting procedural mist, a compass motif, a field-route selector and olive/sand editorial styling. Generated visuals are marked as concept imagery; they are not real client or venue documentation. Existing CMS programme records and booking destinations remain in use.

## Generated assets

Created with the built-in image-generation tool. Original PNGs are stored in `frontend/public/assets/`.

- `karnataka-dawn.png`: cinematic Karnataka granite hills, monsoon greenery, red-earth trail, dawn mist and warm light; dark space on the left for headings; no people, text, insignia, snow or alpine terrain.
- `team-challenge.png`: South Indian adults in plain olive/khaki clothing collaborating on a low timber obstacle; Karnataka boulders, tropical trees and red earth; warm morning light; no weapons, insignia, logos or text. Concept promotional scene.

`field-mist.svg` is a procedural vector atmosphere layer. Animation is implemented in CSS, not a generated video.

## Preview and verification

The existing production server held a DLL lock in `.next`. `NEXT_BUILD_DIR` is now an optional build-directory override, retaining `.next` by default. A separate build passed using `.next-field-build`; the local design preview uses `.next-field-dev` on port 3107.

Browser checks: stage selection, motion pause, reduced-motion behavior, and no horizontal overflow at 390px and 768px. Desktop and mobile screenshots reviewed. No browser page errors in the checked flow.

Additional browser checks passed: actual cloud transform changes over time, mobile menu and Escape, keyboard programme selection, booking route rendering, and hero visibility with JavaScript disabled.
