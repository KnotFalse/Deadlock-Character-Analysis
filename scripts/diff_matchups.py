from __future__ import annotations

import csv
import sys
from pathlib import Path


def load(path: Path) -> dict[tuple[str, str, str], dict[str, str]]:
    data: dict[tuple[str, str, str], dict[str, str]] = {}
    with path.open('r', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            key = (row['source'], row['relationship'], row['target'])
            data[key] = row
    return data


def main() -> None:
    if len(sys.argv) != 3:
        print('Usage: python scripts/diff_matchups.py <old.csv> <new.csv>')
        sys.exit(1)
    old_path = Path(sys.argv[1])
    new_path = Path(sys.argv[2])
    if not old_path.exists() or not new_path.exists():
        print('Both CSV paths must exist.')
        sys.exit(1)
    old = load(old_path)
    new = load(new_path)

    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))

    print(f"Added relationships: {len(added)}")
    for key in added:
        row = new[key]
        print(f" + {row['source']} {row['relationship']} {row['target']} (evidence={row['evidence']}) -> {row['reason']}")

    print(f"Removed relationships: {len(removed)}")
    for key in removed:
        row = old[key]
        print(f" - {row['source']} {row['relationship']} {row['target']} (evidence={row['evidence']}) -> {row['reason']}")


if __name__ == '__main__':
    main()
