# Deadlock Character Graph

Tools and datasets for modeling Valve's *Deadlock* character roster in Neo4j. The repository follows the workflow described in `plan.md`, providing scripts to define schema, ingest researched data, synthesize matchup relationships, and run validation checks.

## Quick Start

1. Provision Neo4j via `docker-compose up -d` (see `plan.md` for configuration).
2. Create a Python virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   ```
3. Configure Neo4j connection settings (see `config.example.env`) and run the CLI:
   ```bash
   python -m deadlock_graph.cli --help
   ```
   The default compose file exposes HTTP on `http://localhost:8474` and Bolt on `bolt://localhost:8687`.

### Counter Annotations

- Use the guidance in `docs/WORKFLOW.md` when tagging ability counters; every counter must cite a source that demonstrates the interaction.
- After editing YAML, re-run `python -m deadlock_graph.cli ingest-character <Hero>` and then `synthesize-matchups` to refresh STRONG/WEAK edges.

## Repository Layout

- `plan.md` – canonical implementation plan.
- `data/` – curated YAML/JSON sources for archetypes, mechanics, and characters.
- `src/deadlock_graph/` – Python package with ingestion and synthesis tooling.
- `agent-logs/` – session transcripts for agent activity (per `AGENTS.md`).
- `docs/` – workflow reference, counter audit, automation outline.
- `scripts/verify_drift.py` – YAML ↔ Neo4j parity check (characters, abilities, mechanics).
- `scripts/export_matchups.py` – exports STRONG/WEAK/EVEN edges to `matchups.csv`.
- `scripts/run_sanity.ps1` – runs drift check, synthesis, validation, and matchup export in one go.

## Sanity Workflow

Before committing, run ./scripts/run_sanity.ps1 to verify YAML ↔ Neo4j parity, regenerate matchups, and export matchups.csv. The script exits with non-zero status if drift is detected so you can address issues early.

CI users can reuse .github/workflows/sanity.yml, which runs scripts/run_sanity_ci.ps1 on pull requests and main pushes.

## Web Apps

- Svelte 5 + SvelteKit v2 (CSR + adapter-static) — Live on GitHub Pages: https://knotfalse.github.io/Deadlock-Character-Analysis/
- React (Vite) explorer — Deprecated and frozen for reference only (`website/` directory). Not deployed.

Key policies:
- SvelteKit is the canonical site. CI validates `static/graph.json` against the JSON Schema, runs Playwright smoke tests, then deploys via `actions/deploy-pages` on pushes to `main` that touch `website-sveltekit/**`.
- For fork PRs, a preview artifact of the built site is uploaded; a separate, fork‑safe workflow comments a summary with node/edge counts.

## Static Site Explorer

The `website/` directory hosts a Vite + React frontend that consumes the exported `graph.json`.

1. Export graph data (from repository root):
   ```bash
   python -m deadlock_graph.cli export-static
   ```
2. Install and run the site:
   ```bash
   cd website
   npm install
   npm run dev
   ```
   The explorer boots on `http://localhost:5173/`.
3. Build the static bundle:
   ```bash
   npm run build
   ```

### Relationship Detail & Analytics

- The left panel still provides label, archetype, relationship, and mechanic filters.
- Clicking any matchup entry in the "Matchup Relationships" list now opens a detail drawer with narrative reasons, evidence counts, and quick links to source/target nodes.
- The Analytics section surfaces:
  - **Out-Degree** rankings for characters with the most outgoing edges.
  - **Strong Matchups** rankings for characters that counter the widest roster.
  - **Mechanic Usage** counts with one-click filtering.
- Metric mode toggles (Default, Out-Degree, Strong Matchups, Mechanic Usage) drive node sizing/coloring in the graph while respecting neighbor/path highlights.

## Deployment

- SvelteKit Pages deploy: `.github/workflows/pages-deploy-sveltekit.yml` builds, validates schema, runs Playwright, uploads the static site, and deploys to GitHub Pages.
- CI build + tests (non-deploy): `.github/workflows/website-sveltekit-build.yml` runs on PRs and pushes for fast feedback and preview artifacts.

To perform a manual preview without the workflow:
```bash
cd website
npm run build
npx vite preview --host
```

## Frontend Tests

- Playwright smoke coverage for React lives in `website/tests/`.
- Local run (build + test):
  ```bash
  cd website
  npm run test:e2e
  ```
- CI runs `npm run test:e2e:ci` (headless Chromium, list reporter). Tests exercise search, neighbor highlighting, path selection, relationship detail, and analytics toggles. During Playwright runs the app automatically enables a “light” graph mode (no WebGL canvas) to avoid headless GPU noise; interactive rendering still loads normally in user builds.

- Svelte (SPA exploration): see `website-svelte/` for local tests.
- SvelteKit (target): `website-sveltekit/tests/` and CI. Validate `graph.json` via `npm run validate:graph` inside `website-sveltekit/`.
