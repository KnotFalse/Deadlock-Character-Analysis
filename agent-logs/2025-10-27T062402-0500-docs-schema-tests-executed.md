# Session Log — Docs + Schema in CI + E2E tests

- Timestamp: 2025-10-27T06:24:02.9018399-05:00
- Repo: deadlock-character-analysis
- Branch: feature/svelte-migration-exploration @ 45c704a

## Summary
- Updated README with Web Apps policy (React Pages live, SvelteKit preview via artifacts) and test notes.
- Enforced schema validation step in SvelteKit CI (validate:graph pre-build; validator uses Ajv).
- Added SvelteKit e2e tests: neighbor toggle and analytics toggles (testids wired).
- All tests pass locally (3 SvelteKit specs).

## Next
- Add export-graph workflow + PR-based graph.json updates.
- Document SPA deprecation criteria and schedule.
- Add perf profiling + budgets to docs.

## Recent Commits
45c704a docs: add Web Apps policy; CI: enforce schema validation; tests: neighbor + analytics e2e for SvelteKit 15680c0 chore(logs): record docs/a11y/schema/preview work 9f868f2 docs+plan: SvelteKit policy; a11y/testids; add JSON schema + CI validation; neighbor toggle; PR comment for preview artifacts; fix package.json; d5db718 chore(logs): record SvelteKit port + CI + perf tweaks 5a5a8ad SvelteKit v2 (Svelte 5): scaffold CSR + adapter-static, port explorer UI/stores, add Playwright + CI workflow, copy graph.json, wire global styles; tests passing locally 7ce7932 chore(logs): record decision to use Svelte 5 + SvelteKit v2 618da3a chore(logs): add session log for Svelte CI fixes and workflow 2849d3e Svelte: add search results list and path summary; fix smoke test; add CI build+test workflow; ignore dist/node_modules; clear stage click 2f099bd test(svelte): add Playwright config + smoke; light-mode guard and selection window hooks; GraphView highlight subscriptions; note Svelte 5 plugin alignment pending a50e9cd feat(svelte): add Sidebar, PathTools, Relationship and Analytics panels; store parity and Sigma highlight layering
