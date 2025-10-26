python scripts/verify_drift.py
python -m deadlock_graph.cli synthesize-matchups
python -m deadlock_graph.cli validate
python scripts/export_matchups.py

