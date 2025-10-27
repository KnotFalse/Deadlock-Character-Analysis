# Session Log — React deprecated; SvelteKit cutover

- Timestamp: 2025-10-27T07:11:31.6493589-05:00
- Repo: deadlock-character-analysis
- Branch: feature/svelte-migration-exploration @ 645665b

## Actions
- Removed React Pages deploy workflow; added SvelteKit Pages deploy via Actions.
- Enabled paths.relative in SvelteKit for GitHub Pages base compatibility.
- Updated README (SvelteKit canonical, React legacy) and added CODEOWNERS to freeze website/.

## Notes
- First deploy will run on next push to main using .github/workflows/pages-deploy-sveltekit.yml.
- Existing SvelteKit build/test workflow remains for PRs; deploy job is separate.

## Recent Commits
645665b cutover: add CODEOWNERS to freeze React site 27efa57 cutover: remove React Pages deploy; SvelteKit paths.relative=true for GitHub Pages base 8586324 chore(logs): Sprint A docs+a11y+perf complete 45ee307 a11y(search): aria-selected + keyboard; perf: simple marks + measurement; docs(plan): add Web Apps addendum; tests: search keyboard 19781f3 chore(logs): record export workflow + a11y/keyboard + new e2e 0899c03 workflow: add export-graph with schema validation + PR; a11y: search results roles/keyboard; tests: mechanic + relationship e2e 191e9b4 chore(logs): record docs + schema CI + new e2e tests 45c704a docs: add Web Apps policy; CI: enforce schema validation; tests: neighbor + analytics e2e for SvelteKit 15680c0 chore(logs): record docs/a11y/schema/preview work 9f868f2 docs+plan: SvelteKit policy; a11y/testids; add JSON schema + CI validation; neighbor toggle; PR comment for preview artifacts; fix package.json;
