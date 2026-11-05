# Cleanup - 5 November 2026

- Removed five unreachable components: Gallery, MissionSelector, ParkExplorer, Reveal and SmoothScroll.
- Removed the unused scope cursor and impact engine, retaining active radar, range target, portrait and HUD graphics.
- Removed retired public-page branches, unused imports, admin-editor state and obsolete activity pagination state.
- Removed four obsolete animation stylesheets. Extracted active shared interactions into a smaller stylesheet, and removed retired detail/card and cursor/blast rules.
- Removed unused Three.js, Anime.js and Three type dependencies: nine installed packages including transitive dependencies. Package and lockfile remain synchronized; remaining versions were not upgraded.
- Removed two obsolete HTML audit snapshots. Updated tests for consolidated pages and Gallery retirement.
- Preserved business content, backend, admin tools, database, final deliverables, original generated artwork, research files and licence notices.

Validation: production build and TypeScript passed. Three desktop Playwright tests passed for catalogue redirects, reduced-motion booking controls and no-JavaScript content. All 12 canonical public pages loaded. Admin login and mobile contact layout were checked; homepage and mobile screenshots were reviewed.

Bulk deletion of ignored temporary screenshots and one-off scripts was blocked by automatic approval review. Those development artifacts remain in ignored directories.
