# Deadlock Graph Workflow

This quick-reference maps the steps in `plan.md` to the commands exposed by the Typer CLI.

## Phase 1 – Schema Definition

- Command: `python -m deadlock_graph.cli bootstrap`
- Effect: Creates/ensures uniqueness constraints for `Character`, `Ability`, `Archetype`, and `Mechanic` nodes.

## Phase 2 – Foundational Ingestion

- Command: `python -m deadlock_graph.cli ingest-foundations`
- Input files: `data/archetypes.yaml`, `data/mechanics.yaml`
- Output: `MERGE`s baseline archetype and mechanic nodes with source metadata.
- Tip: Pass `--dry-run` to validate YAML structure without writing to Neo4j.

## Phase 3 – Character Loop

1. Curate YAML under `data/characters/<slug>.yaml` (examples: `haze.yaml`, `warden.yaml`).
2. Run `python -m deadlock_graph.cli ingest-character <name>` to:
   - Emit `temp/temp_ingest_<slug>.json` as the checkpoint artifact.
   - Ingest the character, abilities, and mechanic relationships (unless `--skip` or `--dry-run` is provided).
3. Use `python -m deadlock_graph.cli ingest-all` when multiple profiles are ready.

## Phase 4 – Matchup Synthesis

- Command: `python -m deadlock_graph.cli synthesize-matchups`
- Behavior:
  1. Clears previously synthesized edges (toggle with `--no-refresh`).
  2. Generates `STRONG_AGAINST`, `WEAK_AGAINST`, and `EVEN_AGAINST` edges using evidence counts.

## Phase 5 – Validation

- Command: `python -m deadlock_graph.cli validate`
- Outputs lists of:
  - Characters missing archetypes
  - Characters without abilities
  - Abilities lacking mechanic analysis

## Maintenance Utilities

- `python -m deadlock_graph.cli roster` — prints the locally tracked roster and archetype mapping.
- Use environment variables (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`) or `.env` to configure connectivity (see `config.example.env`).

## Counter Annotation Guidelines

- **When to add a counter:** Only tag an ability as countering a mechanic if reputable sources (patch notes, official descriptions, or trusted guides) explicitly state that the ability disables, ignores, cleanses, or directly punishes that mechanic (e.g., “prevents movement abilities” → counters `Dash`/`Teleport`).
- **Evidence required:** Provide at least one citation in the hero’s YAML `notes` field or in the mechanic description showing the interaction; avoid speculative counters.
- **Scope:** Counters should reflect gameplay mechanics, not vague strategic claims. If the interaction is situational or requires upgrades, mention those conditions in `notes`.
- **Process:** Update the hero YAML first, extend `data/mechanics.yaml` if a new mechanic category is needed, re-run `ingest-foundations` (when mechanics change), then `ingest-character <Hero>` so Neo4j stays in sync.
- **Review:** Re-run `synthesize-matchups` and `validate` after adding counters to confirm new STRONG/WEAK edges are generated and no validation gaps appear.
