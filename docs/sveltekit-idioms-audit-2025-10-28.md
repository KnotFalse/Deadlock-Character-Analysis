# Svelte 5 + SvelteKit v2 Idioms Audit (2025-10-28)

Scope: website-sveltekit/** as of branch `feature/ui-bugfix-and-ux-pass`.

## Deviations and Recommendations

1) Event directives (prefer runes DOM props)
- Current: `on:click`, `on:change` in several components.
- Files:
  - src/routes/+layout.svelte:24
  - src/lib/components/AnalyticsPanel.svelte:25,37,50,63
  - src/lib/components/RelationshipPanel.svelte:46,61
  - src/lib/components/Sidebar.svelte:56,63,73,83
- Do: use `onclick={...}`, `onchange={...}` (Svelte 5 runes style) consistently. Combobox already uses `onclick`/`oninput`/etc.
  - Reference: Svelte overview examples use `onclick` property on elements (not `on:click`). See https://svelte.dev/docs/svelte. 

2) Props definition (prefer `$props` over `export let`)
- Current: `export let data` in GraphView.svelte.
- File: src/lib/components/GraphView.svelte:8
- Do: `const { data } = $props<{ data: GraphData | null }>();`
  - Reference: `$props` rune — https://svelte.dev/docs/svelte/%24props

3) Local component state (prefer `$state` / `$derived` when template-reactive)
- Current: plain `let` for state that influences markup.
- Files (non-exhaustive):
  - src/routes/+layout.svelte (theme)
  - src/lib/components/ui/Combobox.svelte (filtered computed via function)
- Do: $state for writable state, $derived for computed lists (e.g., `const filtered = $derived(() => ...)`). Leave GraphView’s perf caches as plain locals.
  - References: `$state` — https://svelte.dev/docs/svelte/%24state, `$derived` — https://svelte.dev/docs/svelte/%24derived, `$effect` — https://svelte.dev/docs/svelte/%24effect

4) Aliases/imports (prefer `$lib` over absolute `/types`)
- Current: `import type { ... } from '/types'`.
- File: src/lib/stores/graph.ts:5
- Do: `import type { ... } from '$lib/types';`
  - Reference: `$lib` alias — https://svelte.dev/docs/kit/%24lib

5) Data fetching (prefer `+page.ts` load over `onMount` when possible)
- Current: CSR `onMount(() => fetch('graph.json'))`.
- File: src/routes/+page.svelte
- Do: Move to `+page.ts` `load` (`export const ssr = false` can remain). Keeps future SSR option open and aligns with Kit idioms.
  - Reference: SvelteKit load — https://svelte.dev/docs/kit/load

6) Combobox a11y structure (aria-activedescendant and option ids)
- Current: button inside li for role=option; no `aria-activedescendant` ID wiring.
- File: src/lib/components/ui/Combobox.svelte
- Do: Assign stable `id` per option; manage `aria-activedescendant` on input; use role=option on the item node (not nested button) with `aria-selected`.
  - Reference: WAI-ARIA 1.2 combobox pattern (non‑Svelte). Keep Svelte runes for behavior.

7) Theming side effects with runes
- Current: manual DOM write + localStorage in +layout.svelte; fine under `ssr=false` but mixed with `on:click`.
- File: src/routes/+layout.svelte
- Do: use `$state` for `theme`, and property `onclick`. Keep browser guard for DOM/localStorage access.
  - Reference: Runes overview — https://svelte.dev/docs/svelte/what-are-runes

8) Consistent `$lib` imports in components
- Current: mix of `$lib/...` and relative `../stores/graph`.
- Files: src/lib/components/AnalyticsPanel.svelte (and potentially others)
- Do: normalize to `$lib/...` for lib imports.
  - Reference: `$lib` alias — https://svelte.dev/docs/kit/%24lib

## Notes
- adapter-static with `paths.relative = true`, `prerender = true`, `ssr = false` is consistent with GitHub Pages CSR static hosting.
- GraphView’s internal state intentionally avoids Svelte invalidations (perf); keep that pattern.

## Reference Index (Svelte/SvelteKit)
- Runes overview: https://svelte.dev/docs/svelte/what-are-runes
- $state: https://svelte.dev/docs/svelte/%24state
- $derived: https://svelte.dev/docs/svelte/%24derived
- $props: https://svelte.dev/docs/svelte/%24props
- $effect: https://svelte.dev/docs/svelte/%24effect
- Stores (context): https://svelte.dev/docs/svelte/stores
- SvelteKit load: https://svelte.dev/docs/kit/load
- $lib alias: https://svelte.dev/docs/kit/%24lib
