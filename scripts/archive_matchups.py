from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
import sys


def main() -> None:
    if len(sys.argv) not in {1, 2}:
        print('Usage: python scripts/archive_matchups.py [label]')
        sys.exit(1)
    label = sys.argv[1] if len(sys.argv) == 2 else 'snapshot'
    timestamp = datetime.now().strftime('%Y-%m-%dT%H%M%S')
    src = Path('matchups.csv')
    if not src.exists():
        print('matchups.csv not found; run scripts/run_sanity.ps1 first.')
        sys.exit(1)
    dest_dir = Path('matchups_history')
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / f"{timestamp}_{label}.csv"
    shutil.copy(src, dest)
    print(f'Archived {src} -> {dest}')


if __name__ == '__main__':
    main()
