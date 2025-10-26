from __future__ import annotations

from pathlib import Path

from deadlock_graph.config import get_settings
from deadlock_graph.db import Neo4jClient
from deadlock_graph.loaders import iter_character_profiles, load_mechanics


def collect_yaml_state(data_root: Path) -> tuple[set[str], set[str], set[str]]:
    profiles = list(iter_character_profiles(data_root / "characters"))
    characters = {profile.character.name for profile in profiles}
    abilities: set[str] = set()
    for profile in profiles:
        for ability in profile.abilities:
            abilities.add(ability.name)
    mechanics = {mechanic.name for mechanic in load_mechanics(data_root / "mechanics.yaml")}
    return characters, abilities, mechanics


def collect_db_state(client: Neo4jClient) -> tuple[set[str], set[str], set[str]]:
    with client.session() as session:
        characters = {record["name"] for record in session.run("MATCH (c:Character) RETURN c.name AS name")}
        abilities = {record["name"] for record in session.run("MATCH (a:Ability) RETURN a.name AS name")}
        mechanics = {record["name"] for record in session.run("MATCH (m:Mechanic) RETURN m.name AS name")}
    return characters, abilities, mechanics


def print_diff(label: str, yaml_set: set[str], db_set: set[str]) -> None:
    only_yaml = sorted(yaml_set - db_set)
    only_db = sorted(db_set - yaml_set)
    print(f"{label}: YAML={len(yaml_set)} | DB={len(db_set)}")
    if only_yaml:
        print(f"  - Missing in DB ({len(only_yaml)}): {', '.join(only_yaml)}")
    if only_db:
        print(f"  - Missing in YAML ({len(only_db)}): {', '.join(only_db)}")


def main() -> None:
    settings = get_settings()
    yaml_characters, yaml_abilities, yaml_mechanics = collect_yaml_state(settings.data_root)
    client = Neo4jClient(settings.neo4j_uri, auth=(
        settings.neo4j_user or "",
        settings.neo4j_password or "",
    ) if settings.neo4j_user or settings.neo4j_password else None)
    try:
        db_characters, db_abilities, db_mechanics = collect_db_state(client)
    finally:
        client.close()

    print_diff("Characters", yaml_characters, db_characters)
    print_diff("Abilities", yaml_abilities, db_abilities)
    print_diff("Mechanics", yaml_mechanics, db_mechanics)


if __name__ == "__main__":
    main()
