# Public inner-page design review - 3 November 2026

## Changes

- CMS-managed About, Corporate, Schools & Colleges, Kids Experiences and Accommodation now render as editorial chapters instead of plain prose. Chapter navigation, animated headings, image masks, photographic panels and compass graphics preserve the published text.
- Shared public heroes and orientation strips carry the field theme across the site. Motion controls appear on non-policy heroes. Mobile framed heroes keep image and text separate.
- Activity browsing uses photographic cards, audience-specific category images, search/filtering and progressive loading in groups of 12.
- All programme, activity and package detail routes use structured information panels, clearer activity lists and an illustrated booking sidebar.
- Dining menus are programme disclosures with meal icons and readable dish lists.
- Forms, FAQs, client/empty states and policy typography have consistent spacing, borders and hierarchy. Policy pages retain restrained motion and readable text.
- The existing scope-cursor effect now responds to the site motion preference.

## Verification

Browser sweep: 101 published inner routes (22 top-level pages, 9 programme details, 70 activity details), each at 1440px and 390px widths. All returned HTTP 200, with no detected page errors, horizontal overflow or broken loaded images. Screenshots and route results are retained under `tmp/inner-review/`.

Targeted interaction checks passed: mobile hero separation, activity search/load more, menu disclosures, chapter anchors, reduced motion and no-JavaScript content. Representative desktop/mobile screenshots were visually reviewed; a sidebar contrast issue and mobile hero overlap were corrected.

Production build and TypeScript checks passed. No booking or enquiry submission was made during testing.

Targeted axe checks on Corporate, Food & Dining and a programme detail page passed for color contrast, button names, link names and image alternatives after darkening the meal index labels.
