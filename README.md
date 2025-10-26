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
\n## Static Site\n- Generate graph data: \python -m deadlock_graph.cli export-static\\n- Develop the frontend: \cd website && npm run dev\\n- Build for Pages: \
pm run build\ (see \website/README.md\ for details).\n
