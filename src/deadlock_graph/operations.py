from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable, List

from .db import Neo4jClient
from .models import Archetype, CharacterProfile, Mechanic


CONSTRAINT_QUERIES = [
    "CREATE CONSTRAINT character_name_unique IF NOT EXISTS FOR (c:Character) REQUIRE c.name IS UNIQUE",
    "CREATE CONSTRAINT ability_name_unique IF NOT EXISTS FOR (a:Ability) REQUIRE a.name IS UNIQUE",
    "CREATE CONSTRAINT archetype_name_unique IF NOT EXISTS FOR (arch:Archetype) REQUIRE arch.name IS UNIQUE",
    "CREATE CONSTRAINT mechanic_name_unique IF NOT EXISTS FOR (m:Mechanic) REQUIRE m.name IS UNIQUE",
]


def apply_constraints(client: Neo4jClient) -> None:
    for query in CONSTRAINT_QUERIES:
        client.execute(query)


def ingest_archetypes(client: Neo4jClient, archetypes: Iterable[Archetype]) -> None:
    rows = []
    for arch in archetypes:
        payload = arch.model_dump()
        payload["sources"] = [str(src) for src in payload.get("sources", [])]
        rows.append(payload)
    if not rows:
        return
    query = """
    UNWIND $rows AS row
    MERGE (a:Archetype {name: row.name})
    SET a.description = row.description,
        a.signature_traits = coalesce(row.signature_traits, []),
        a.notes = row.notes,
        a.sources = coalesce(row.sources, [])
    """
    client.execute(query, {"rows": rows})


def ingest_mechanics(client: Neo4jClient, mechanics: Iterable[Mechanic]) -> None:
    rows = []
    for mech in mechanics:
        payload = mech.model_dump()
        payload["sources"] = [str(src) for src in payload.get("sources", [])]
        rows.append(payload)
    if not rows:
        return
    query = """
    UNWIND $rows AS row
    MERGE (m:Mechanic {name: row.name})
    SET m.category = row.category,
        m.description = row.description,
        m.archetype_implications = coalesce(row.archetype_implications, []),
        m.sources = coalesce(row.sources, [])
    """
    client.execute(query, {"rows": rows})


def _character_parameters(profile: CharacterProfile) -> dict[str, Any]:
    character = profile.character.model_dump()
    character["source_url"] = str(character.get("source_url"))
    character["last_updated"] = profile.character.last_updated.isoformat()
    abilities: List[dict[str, Any]] = []
    for ability in profile.abilities:
        ability_payload = ability.model_dump()
        ability_payload["mechanics"] = ability.mechanics.model_dump()
        abilities.append(ability_payload)
    return {"character": character, "abilities": abilities}


def ingest_character(client: Neo4jClient, profile: CharacterProfile) -> None:
    params = _character_parameters(profile)
    query = """
    MERGE (c:Character {name: $character.name})
    SET c.description = $character.description,
        c.source_url = $character.source_url,
        c.last_updated = datetime($character.last_updated),
        c.aliases = coalesce($character.aliases, [])
    WITH c
    MATCH (arch:Archetype {name: $character.archetype})
    MERGE (c)-[:IS_ARCHETYPE]->(arch)
    WITH c
    UNWIND $abilities AS ability
    MERGE (ab:Ability {name: ability.name})
    SET ab.description = ability.description,
        ab.type = ability.type,
        ab.slot = ability.slot,
        ab.notes = ability.notes
    MERGE (c)-[has:HAS_ABILITY]->(ab)
    SET has.slot = ability.slot,
        has.type = ability.type
    WITH c, ab, ability
    FOREACH (mech_name IN coalesce(ability.mechanics.uses, []) |
        MERGE (m:Mechanic {name: mech_name})
        MERGE (ab)-[:USES_MECHANIC]->(m)
    )
    FOREACH (counter_name IN coalesce(ability.mechanics.counters, []) |
        MERGE (m:Mechanic {name: counter_name})
        MERGE (ab)-[:COUNTERS_MECHANIC]->(m)
        MERGE (c)-[:CHARACTER_COUNTERS_MECHANIC]->(m)
    )
    """
    client.execute(query, params)


def clear_synthesized_matchups(client: Neo4jClient) -> None:
    client.execute(
        """
        MATCH (c:Character)-[r:STRONG_AGAINST|WEAK_AGAINST|EVEN_AGAINST]->()
        DELETE r
        """
    )


def synthesize_matchups(client: Neo4jClient) -> None:
    strong_query = """
    MATCH (c1:Character)-[:HAS_ABILITY]->(ab1:Ability)-[:COUNTERS_MECHANIC]->(m:Mechanic),
          (c2:Character)-[:HAS_ABILITY]->(ab2:Ability)-[:USES_MECHANIC]->(m)
    WHERE c1 <> c2
    MERGE (c1)-[r:STRONG_AGAINST]->(c2)
    SET r.reason = coalesce(r.reason, "") +
          "[" + ab1.name + "] counters [" + ab2.name + " via " + m.name + "]. ",
        r.evidence_count = coalesce(r.evidence_count, 0) + 1
    MERGE (c2)-[r2:WEAK_AGAINST]->(c1)
    SET r2.reason = coalesce(r2.reason, "") +
          "[" + ab2.name + "] is countered by [" + ab1.name + " via " + m.name + "]. ",
        r2.evidence_count = coalesce(r2.evidence_count, 0) + 1
    """
    client.execute(strong_query)

    even_query = """
    MATCH (a:Character), (b:Character)
    WHERE a.name < b.name
      AND NOT (a)-[:STRONG_AGAINST|WEAK_AGAINST]-(b)
    MERGE (a)-[r:EVEN_AGAINST]->(b)
    SET r.reason = "No direct ability or mechanic counters found."
    MERGE (b)-[r2:EVEN_AGAINST]->(a)
    SET r2.reason = "No direct ability or mechanic counters found."
    """
    client.execute(even_query)


def run_validation_queries(client: Neo4jClient) -> dict[str, list[str]]:
    results: dict[str, list[str]] = {}
    queries = {
        "character_missing_archetype": """
            MATCH (c:Character)
            WHERE NOT (c)-[:IS_ARCHETYPE]->()
            RETURN c.name AS name
        """,
        "character_missing_abilities": """
            MATCH (c:Character)
            WHERE NOT (c)-[:HAS_ABILITY]->()
            RETURN c.name AS name
        """,
        "ability_missing_analysis": """
            MATCH (ab:Ability)
            WHERE NOT (ab)-[:USES_MECHANIC]->()
              AND NOT (ab)-[:COUNTERS_MECHANIC]->()
            RETURN ab.name AS name
        """,
    }
    with client.session() as session:
        for key, cypher in queries.items():
            records = session.run(cypher)
            results[key] = [record["name"] for record in records]
    return results
