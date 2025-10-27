# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Performance

The explorer emits lightweight performance marks when `window.__PERF_LOG__ = true` (enabled in Playwright tests):

- search-input: time from debounced input to highlight application
- neighbor-toggle: time from toggle change to highlight application

Initial targets (informational):
- Mount (first content + metadata render): < 800 ms in CI preview
- Neighbor toggle highlight: < 50 ms
- Search → highlight: < 120 ms (includes 200 ms debounce)

View timings in the browser console during local dev or in CI logs for SvelteKit tests. These are non‑gating; we’ll gate only if regressions appear.
