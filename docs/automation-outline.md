# Automation Outline

Potential tooling to add once roster coverage stabilises:

1. **YAML ↔ Neo4j drift check**  
   - Implemented as `scripts/verify_drift.py`.  
   - Compares character, ability, and mechanic sets between YAML and the live database.  
   - Integrate into CI by failing the build when deltas are reported.

2. **Matchup snapshot exporter**  
   - Implemented as `scripts/export_matchups.py` (CSV output).  
   - Re-run automatically after `synthesize-matchups`; consider wiring into release notes.

3. **Counter coverage report**  
   - Iterate mechanics and list which heroes provide counters.  
   - Highlights overrepresented mechanics (e.g., Movement Slow cleanses) to guide research.  
   - Integrates with `docs/counter-audit.md`.

4. **Patch diff monitor (future)**  
   - Poll official patch feeds, diff ability descriptions, and open TODO entries when changes detected.  
   - Requires source URL metadata to be populated consistently in YAML.

Documented here for planning; no automation is implemented yet.
