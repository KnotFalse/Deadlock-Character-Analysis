# Next Steps — UI Bugfix + UX/A11y Pass (2025-10-27)

Context
- SvelteKit is the canonical site (adapter-static, relative paths). Pages deploy is active.
- Export pipeline aggregates edges (type, source, target), recomputes indexes, and strict CI validation is in place.
- Sidebar now uses a reusable Combobox for search and mechanic filter.
- All Playwright tests are green locally (9 specs), including mobile.

Open Issues To Address (Prioritized)
1) Node size inflation when toggling Neighbor/Path
   - Store a `baseSize` per node at graph build time; compute sizes from `baseSize` for metric/search/neighbor/path/selected. Avoid reusing mutated size as a base.

2) Filters (Labels/Archetypes/Relationships) not affecting graph visibility
   - In GraphView, subscribe to `visibleNodeIds` and hide/unhide nodes via Graphology/Sigma hidden attributes. Hide edges attached to hidden nodes.

3) Search combobox UX density & behavior
   - Remove bullets from listbox, keep typed text visible, show selected label in the input, maintain focus after selection.
   - Sidebar spacing: tighten `.section` gaps, reduce sidebar card padding, collapse less-frequent sections.

4) Relationship panel layout & headings
   - Render 3-column layout on desktop with clear headings, sorted lists; stack on mobile.

5) Analytics lists show human names
   - Replace `character:NAME` with `NAME` using node properties.

6) Graph label legibility in dark mode
   - Configure Sigma label color and background to match theme; no white label bg on hover; readable default labels.

7) Path Tools comboboxes (one-row Start/End)
   - Replace selects with Combobox; show all options with scroll (max-height ~60vh); keep inline action buttons.

8) Mobile polish
   - ≤800px: stack grid; sections collapsible; ensure listbox height is `min(60vh, 320px)` and z-index above cards.

9) A11y + keyboard parity
   - Combobox: aria-activedescendant, option ids, aria-selected (partially done). Add stricter keyboard-only e2e.

Delivery Strategy
- Branch: `feature/ui-bugfix-and-ux-pass`.
- Phase 1: Fix size inflation + visibility (filters) then verify Analytics effect.
- Phase 2: Sidebar density + search combobox polish.
- Phase 3: Relationship panel layout + analytics label names.
- Phase 4: Graph label legibility + Path Tools combobox.
- Phase 5: Mobile + a11y keyboard spec.
- Phase 6: Merge → Pages verify → log deploy.

Acceptance (minimum)
- No size inflation after toggles; filters hide/show nodes immediately.
- Search input behaves predictably; mechanic clear doesn’t error.
- Relationship panel shows 3 columns with headings on desktop.
- Analytics pills materially change node sizes in graph.
- Dark-mode labels readable, no white label bg on hover.
- All Playwright tests (desktop + mobile) green in CI.

