from __future__ import annotations

import csv
from pathlib import Path

from deadlock_graph.config import get_settings
from deadlock_graph.db import Neo4jClient


def fetch_relationships(client: Neo4jClient) -> list[dict[str, str]]:
    query = """
    MATCH (c1:Character)-[r:STRONG_AGAINST|WEAK_AGAINST|EVEN_AGAINST]->(c2:Character)
    RETURN c1.name AS source, type(r) AS relationship, c2.name AS target,
           coalesce(r.reason, '') AS reason, coalesce(r.evidence_count, 0) AS evidence
    ORDER BY source, relationship, target
    """
    with client.session() as session:
        return [record.data() for record in session.run(query)]


def main() -> None:
    settings = get_settings()
    client = Neo4jClient(settings.neo4j_uri, auth=(
        settings.neo4j_user or "",
        settings.neo4j_password or "",
    ) if settings.neo4j_user or settings.neo4j_password else None)
    try:
        rows = fetch_relationships(client)
    finally:
        client.close()

    output = Path("matchups.csv")
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["source", "relationship", "target", "evidence", "reason"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "source": row["source"],
                    "relationship": row["relationship"],
                    "target": row["target"],
                    "evidence": row["evidence"],
                    "reason": row["reason"],
                }
            )
    print(f"Exported {len(rows)} relationships to {output}")


if __name__ == "__main__":
    main()
