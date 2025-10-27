# Session Log — PR comment enrichment, schema governance, export hardening

- Timestamp: 2025-10-27T07:54:24.9152633-05:00
- Repo: deadlock-character-analysis
- Branch: feature/svelte-migration-exploration @ 17cac6c

## Changes
- SvelteKit CI PR comment now includes node/edge counts and generated_at (parsed from static/graph.json).
- Schema governance: added schema/CHANGELOG.md and PR template checkbox; validate script prints schema id/version along with counts.
- Export pipeline hardening: skip PRs when no diff (hash-check), set artifact retention, label PRs as data:update.

## Notes
- Next: add optional post-deploy health probe; perf advisories (non-gating) once we gather baseline runs.

## Recent Commits
17cac6c ci: enrich SvelteKit PR comments with counts; schema governance (CHANGELOG + PR template + schema id prints); export pipeline hardening (hash-check, retention, labels) d1cc39f chore(logs): perf+a11y+tests+docs updates 650f1ec perf/docs: document budgets; a11y: roles/testids for relationship/path; tests: keyboard init + relationship by testid; log perf measures 832b47b chore(logs): record React deprecation and SvelteKit cutover 645665b cutover: add CODEOWNERS to freeze React site 27efa57 cutover: remove React Pages deploy; SvelteKit paths.relative=true for GitHub Pages base 8586324 chore(logs): Sprint A docs+a11y+perf complete 45ee307 a11y(search): aria-selected + keyboard; perf: simple marks + measurement; docs(plan): add Web Apps addendum; tests: search keyboard 19781f3 chore(logs): record export workflow + a11y/keyboard + new e2e 0899c03 workflow: add export-graph with schema validation + PR; a11y: search results roles/keyboard; tests: mechanic + relationship e2e
