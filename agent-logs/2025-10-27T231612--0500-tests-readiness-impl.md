# Session Log - Tests Readiness + Runes Migration

Repo: deadlock-character-analysis
Branch: feature/ui-bugfix-and-ux-pass @ 17daeb8
Date: 2025-10-27T23:16:12

## Changes
- Added appReady sentinel store and DOM marker; window __GRAPH_READY__ set when ready.
- Hardened +page.ts load with fallback + error exposure (data-testid=load-error).
- Added tests/utils/app.ts with waitForApp and searchFor; refactored specs to use it.
- Kept GraphView light-mode and null guards; made container/lightMode rune-based.
- Build OK; Playwright still failing to detect readiness; next iteration planned.

## Next Steps
- Instrument preview: console.info logs for load path and appReady flip; optionally render sidebar/search only after .
- Re-run Playwright; if failures persist, add temporary direct wait for app-ready sentinel in helpers and log window.__GRAPH_LOAD_ERROR__.