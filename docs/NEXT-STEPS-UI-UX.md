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
- Search input behaves predictably; mechanic clear doesn't error.
- Relationship panel shows 3 columns with headings on desktop.
- Analytics pills materially change node sizes in graph.
- Dark-mode labels readable, no white label bg on hover.
- All Playwright tests (desktop + mobile) green in CI.

---

Addendum 2025-10-28 — Runes/Kit Idioms Migration

- Events → runes props: replace `on:*` with `onclick`, `onchange`, `oninput`, etc. (Svelte 5 runes style). Ref: Svelte overview uses `onclick` — svelte.dev/docs/svelte
- Props → `$props`: migrate `export let` → `$props` in Svelte 5 components (e.g., GraphView). Ref: svelte.dev/docs/svelte/%24props
- Local state → `$state`/`$derived` wherever template depends on it (e.g., Combobox `filtered`). Refs: svelte.dev/docs/svelte/%24state, /%24derived
- Imports: fix `'/types'` → `$lib/types`; normalize `$lib/**` imports. Ref: svelte.dev/docs/kit/%24lib
- Data load: move `graph.json` fetch to `+page.ts` `load` (keeping `ssr=false`); improves alignment with Kit data model. Ref: svelte.dev/docs/kit/load
- Combobox a11y: add `aria-activedescendant` and option `id`s; apply role=option on the item; maintain `aria-selected`.
- Labels legibility: finalize Sigma hover label background removal via renderer options.

Acceptance (runes/Kit migration)
- No usages of `on:*` remain under `website-sveltekit/src/**` (except third‑party code). All handlers use property style.
- No `export let` in Svelte 5 components that render in our app; props declared via `$props`.
- Combobox input sets `aria-activedescendant` while open and options have stable `id`s and correct roles.
- All imports under `src/lib/**` use `$lib/...` (and `'/types'` is removed).
- `+page.ts` has a `load` that fetches `graph.json`, and `+page.svelte` consumes the data.

---

Progress 2025-10-27
- Phase 1: Implemented baseSize sizing and filter-driven visibility (nodes/edges) in GraphView.
- Phase 2: Sidebar density tightened; Combobox UX polish (no bullets, focus retention).
- Phase 3: Relationship panel laid out as 3-column grid with headings; mobile stack pending.
- Phase 4: Analytics lists now show human names; Sigma label styling still pending.
- Phase 6: Path Tools converted to Combobox with scroll; tests updated accordingly.
