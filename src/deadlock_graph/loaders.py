from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, Iterator, List

import yaml

from .models import (
    Archetype,
    CharacterList,
    CharacterProfile,
    Mechanic,
)


def _read_yaml(path: Path) -> Dict:
    if not path.exists():
        raise FileNotFoundError(f"Expected file not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_archetypes(path: Path) -> List[Archetype]:
    payload = _read_yaml(path)
    entries = payload.get("archetypes", [])
    return [Archetype(**entry) for entry in entries]


def load_mechanics(path: Path) -> List[Mechanic]:
    payload = _read_yaml(path)
    entries = payload.get("mechanics", [])
    return [Mechanic(**entry) for entry in entries]


def load_character_profile(path: Path) -> CharacterProfile:
    payload = _read_yaml(path)
    return CharacterProfile(**payload)


def iter_character_profiles(directory: Path) -> Iterator[CharacterProfile]:
    for path in sorted(directory.glob("*.yaml")):
        yield load_character_profile(path)


def load_character_list(path: Path) -> CharacterList:
    payload = _read_yaml(path)
    return CharacterList(**payload)


def write_checkpoint(profile: CharacterProfile, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(profile.dict(), handle, indent=2, default=str)
