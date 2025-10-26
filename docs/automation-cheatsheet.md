# Automation Cheatsheet

## Drift Check
- Run python scripts/verify_drift.py after editing YAML.
- Expected output: matching counts and no 'Missing' entries.

## Matchup Export
- After python -m deadlock_graph.cli synthesize-matchups, export relationships via:
  `powershell
  python scripts\export_matchups.py
  `
- Output written to matchups.csv.

## Sanity Wrapper
- Run all sanity steps with:
  `powershell
  ./scripts/run_sanity.ps1
  `
- The script runs erify_drift, synthesize-matchups, alidate, and xport_matchups in sequence.

## CI Idea
- Consider porting the wrapper into CI once the roster is stable.
\n## Matchup Diff\n- Compare two matchup exports (e.g., before vs. after patch):\n  `powershell\n  python scripts\\diff_matchups.py matchups_old.csv matchups.csv\n  `\n- Output lists added and removed STRONG/WEAK/EVEN relationships with reasons.\n
\n## Patch Reporting\n- Archive current matchups: python scripts/archive_matchups.py <label> or run ./scripts/report_matchups.ps1 -Label <label> to archive, rerun sanity, and diff automatically.\n
