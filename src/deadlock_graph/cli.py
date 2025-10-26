from __future__ import annotations

from contextlib import closing
from datetime import datetime
import json
from pathlib import Path
from typing import Optional

import networkx as nx
import typer

from .config import get_settings
from .db import Neo4jClient
from .loaders import (
    iter_character_profiles,
    load_archetypes,
    load_character_list,
    load_character_profile,
    load_mechanics,
    write_checkpoint,
)
from .operations import (
    apply_constraints,
    clear_synthesized_matchups,
    ingest_archetypes,
    ingest_character,
    ingest_mechanics,
    run_validation_queries,
    synthesize_matchups,
)


app = typer.Typer(help="Deadlock graph ingestion toolkit.")


def _build_client(settings) -> Neo4jClient:
    auth = None
    if settings.neo4j_user or settings.neo4j_password:
        auth = (settings.neo4j_user or "", settings.neo4j_password or "")
    return Neo4jClient(settings.neo4j_uri, auth=auth)


def _resolve_character_path(name: str, data_root: Path) -> Path:
    slug = name.lower().replace("&", "and").replace(" ", "_")
    return data_root / "characters" / f"{slug}.yaml"


@app.command()
def bootstrap() -> None:
    """Create schema constraints."""
    settings = get_settings()
    with closing(_build_client(settings)) as client:
        apply_constraints(client)
    typer.echo("Schema constraints ensured.")


@app.command("ingest-foundations")
def ingest_foundations(
    archetypes_path: Optional[Path] = typer.Option(
        None, "--archetypes", "-a", help="Path to archetypes YAML."
    ),
    mechanics_path: Optional[Path] = typer.Option(
        None, "--mechanics", "-m", help="Path to mechanics YAML."
    ),
    dry_run: bool = typer.Option(False, help="Skip database writes."),
) -> None:
    """Load archetype and mechanic baselines."""
    settings = get_settings()
    arch_path = archetypes_path or settings.data_root / "archetypes.yaml"
    mech_path = mechanics_path or settings.data_root / "mechanics.yaml"
    archetypes = load_archetypes(arch_path)
    mechanics = load_mechanics(mech_path)
    typer.echo(f"Loaded {len(archetypes)} archetypes and {len(mechanics)} mechanics.")
    if dry_run or settings.dry_run:
        typer.echo("Dry-run mode active; skipping Neo4j ingestion.")
        return
    with closing(_build_client(settings)) as client:
        apply_constraints(client)
        ingest_archetypes(client, archetypes)
        ingest_mechanics(client, mechanics)
    typer.echo("Foundational data ingested.")


@app.command("ingest-character")
def ingest_character_cmd(
    name: Optional[str] = typer.Argument(
        None, help="Character name to ingest (maps to data/characters/<slug>.yaml)."
    ),
    path: Optional[Path] = typer.Option(
        None, "--path", "-p", help="Explicit path to character YAML."
    ),
    skip_ingest: bool = typer.Option(
        False, "--skip", help="Only write checkpoint, do not push to Neo4j."
    ),
    dry_run: bool = typer.Option(False, help="Skip database writes."),
) -> None:
    """Checkpoint and ingest a single character profile."""
    settings = get_settings()
    if not name and not path:
        raise typer.BadParameter("Provide a character name or --path.")
    character_path = path or _resolve_character_path(name or "", settings.data_root)
    profile = load_character_profile(character_path)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = settings.temp_dir / f"temp_ingest_{profile.character.slug}.json"
    write_checkpoint(profile, checkpoint_path)
    typer.echo(f"Wrote checkpoint {checkpoint_path}")
    if skip_ingest or dry_run or settings.dry_run:
        typer.echo("Dry-run/skip flag detected; halting before database ingestion.")
        return
    with closing(_build_client(settings)) as client:
        apply_constraints(client)
        ingest_character(client, profile)
    typer.echo(f"Ingested {profile.character.name} into Neo4j.")


@app.command("ingest-all")
def ingest_all_characters(
    dry_run: bool = typer.Option(False, help="Skip database writes."),
) -> None:
    """Ingest every character YAML under data/characters."""
    settings = get_settings()
    profiles = list(iter_character_profiles(settings.data_root / "characters"))
    typer.echo(f"Prepared {len(profiles)} character profiles.")
    if dry_run or settings.dry_run:
        for profile in profiles:
            checkpoint_path = settings.temp_dir / f"temp_ingest_{profile.character.slug}.json"
            write_checkpoint(profile, checkpoint_path)
        typer.echo("Dry-run complete; checkpoints generated for all profiles.")
        return
    with closing(_build_client(settings)) as client:
        apply_constraints(client)
        for profile in profiles:
            write_checkpoint(
                profile,
                settings.temp_dir / f"temp_ingest_{profile.character.slug}.json",
            )
            ingest_character(client, profile)
    typer.echo("All characters ingested.")


@app.command("synthesize-matchups")
def synthesize_matchups_cmd(
    refresh: bool = typer.Option(True, "--refresh/--no-refresh", help="Clear synthesized edges first."),
) -> None:
    """Generate STRONG/WEAK/EVEN matchup relationships."""
    settings = get_settings()
    with closing(_build_client(settings)) as client:
        if refresh:
            clear_synthesized_matchups(client)
            typer.echo("Cleared existing synthesized matchups.")
        synthesize_matchups(client)
    typer.echo("Matchups synthesized.")


@app.command()
def validate() -> None:
    """Run validation queries and print outstanding gaps."""
    settings = get_settings()
    with closing(_build_client(settings)) as client:
        results = run_validation_queries(client)
    empty = True
    for key, values in results.items():
        if values:
            empty = False
            typer.echo(f"{key}: {', '.join(values)}")
    if empty:
        typer.echo("No validation gaps found.")


@app.command("roster")
def show_roster() -> None:
    """Print known roster from data/character_list.yaml."""
    settings = get_settings()
    roster = load_character_list(settings.data_root / "character_list.yaml")
    typer.echo(f"Roster last checked: {roster.meta.get('last_checked')}")
    for entry in roster.characters:
        typer.echo(f"- {entry.name} ({entry.archetype}) [{entry.status}]")


@app.command("export-static")
def export_static(
    out: Path = typer.Option(
        Path("website/public/graph.json"),
        "--out",
        "-o",
        help="Path to write the exported graph JSON.",
    ),
) -> None:
    """
    Export the curated YAML dataset (nodes + matchups) as a static JSON graph for the website.
    """
    settings = get_settings()
    data_root = settings.data_root

    archetypes = {a.name: a for a in load_archetypes(data_root / "archetypes.yaml")}
    mechanics = {m.name: m for m in load_mechanics(data_root / "mechanics.yaml")}
    roster = load_character_list(data_root / "character_list.yaml")
    archetype_lookup = {entry.name: entry.archetype for entry in roster.characters}
    character_profiles = {profile.character.name: profile for profile in iter_character_profiles(data_root / "characters")}

    nodes: list[dict] = []
    edges: list[dict] = []

    # Utility to append node once with metadata
    def add_node(node_id: str, label: str, props: dict, size: float) -> None:
        nodes.append(
            {
                "id": node_id,
                "label": label,
                "properties": props,
                "size": size,
            }
        )

    # Archetype nodes
    for arch in sorted(archetypes.values(), key=lambda a: a.name):
        add_node(
            node_id=f"archetype:{arch.name}",
            label="Archetype",
            props={
                "name": arch.name,
                "description": arch.description,
                "signature_traits": arch.signature_traits,
                "notes": arch.notes,
                "sources": [str(src) for src in arch.sources],
            },
            size=2.5,
        )

    # Mechanic nodes
    for mech in sorted(mechanics.values(), key=lambda m: m.name):
        add_node(
            node_id=f"mechanic:{mech.name}",
            label="Mechanic",
            props={
                "name": mech.name,
                "description": mech.description,
                "category": mech.category,
                "archetype_implications": mech.archetype_implications,
                "sources": [str(src) for src in mech.sources],
            },
            size=1.5,
        )

    # Ability nodes
    ability_nodes_added: set[str] = set()
    for profile in character_profiles.values():
        for ability in profile.abilities:
            ability_id = f"ability:{ability.name}"
            if ability_id in ability_nodes_added:
                continue
            add_node(
                node_id=ability_id,
                label="Ability",
                props={
                    "name": ability.name,
                    "slot": ability.slot,
                    "type": ability.type,
                    "description": ability.description,
                    "notes": ability.notes,
                },
                size=1.0,
            )
            ability_nodes_added.add(ability_id)

    # Character nodes
    for name, profile in sorted(character_profiles.items()):
        archetype = archetype_lookup.get(name)
        add_node(
            node_id=f"character:{name}",
        label="Character",
        props={
            "name": name,
            "description": profile.character.description,
            "archetype": archetype,
            "source_url": str(profile.character.source_url),
            "last_updated": profile.character.last_updated.isoformat(),
            "abilities": [ability.name for ability in profile.abilities],
            "ability_slots": [
                {"name": ability.name, "slot": ability.slot, "type": ability.type}
                for ability in profile.abilities
            ],
            "mechanics_used": sorted(
                {mech for ability in profile.abilities for mech in ability.mechanics.uses}
            ),
            "mechanics_countered": sorted(
                {mech for ability in profile.abilities for mech in ability.mechanics.counters}
            ),
        },
        size=2.0,
    )

    # Relationship helpers
    def add_edge(edge_id: str, source: str, target: str, rel_type: str, props: dict | None = None) -> None:
        edges.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "type": rel_type,
                "properties": props or {},
            }
        )

    # Character -> Archetype
    for name, profile in character_profiles.items():
        archetype = archetype_lookup.get(name)
        if archetype:
            add_edge(
                edge_id=f"edge:character:{name}::archetype:{archetype}",
                source=f"character:{name}",
                target=f"archetype:{archetype}",
                rel_type="IS_ARCHETYPE",
            )

    # Character -> Ability & ability relationships
    for name, profile in character_profiles.items():
        char_id = f"character:{name}"
        for ability in profile.abilities:
            ability_id = f"ability:{ability.name}"
            add_edge(
                edge_id=f"edge:{char_id}->{ability_id}",
                source=char_id,
                target=ability_id,
                rel_type="HAS_ABILITY",
                props={"slot": ability.slot, "ability_type": ability.type},
            )
            # Ability uses mechanics
            for mech_name in ability.mechanics.uses:
                if mech_name in mechanics:
                    mech_id = f"mechanic:{mech_name}"
                    add_edge(
                        edge_id=f"edge:{ability_id}->{mech_id}:uses",
                        source=ability_id,
                        target=mech_id,
                        rel_type="USES_MECHANIC",
                    )
            # Ability counters mechanics
            for mech_name in ability.mechanics.counters:
                if mech_name in mechanics:
                    mech_id = f"mechanic:{mech_name}"
                    add_edge(
                        edge_id=f"edge:{ability_id}->{mech_id}:counters",
                        source=ability_id,
                        target=mech_id,
                        rel_type="COUNTERS_MECHANIC",
                    )
                    add_edge(
                        edge_id=f"edge:{char_id}->{mech_id}:character_counter",
                        source=char_id,
                        target=mech_id,
                        rel_type="CHARACTER_COUNTERS_MECHANIC",
                        props={"ability": ability.name},
                    )

    # Matchup data from CSV if available
    matchups_path = Path("matchups.csv")
    if matchups_path.exists():
        import csv

        with matchups_path.open("r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for idx, row in enumerate(reader):
                source = row["source"]
                target = row["target"]
                rel_type = row["relationship"]
                edge_id = f"edge:matchup:{idx}"
                add_edge(
                    edge_id=edge_id,
                    source=f"character:{source}",
                    target=f"character:{target}",
                    rel_type=rel_type,
                    props={
                        "evidence": int(row.get("evidence", "0")),
                        "reason": row.get("reason", ""),
                    },
                )
    else:
        typer.echo("matchups.csv not found; skipping matchup edges.", err=True)

    # Build networkx graph for layout and neighborhood indexes
    g = nx.Graph()
    for node in nodes:
        g.add_node(node["id"])
    for edge in edges:
        g.add_edge(edge["source"], edge["target"])

    layout = nx.spring_layout(g, seed=42, k=None, iterations=100)
    for node in nodes:
        coords = layout.get(node["id"], (0.0, 0.0))
        node["x"], node["y"] = float(coords[0]), float(coords[1])

    # Degree metrics
    degrees_in: dict[str, int] = {}
    degrees_out: dict[str, int] = {}
    for edge in edges:
        degrees_out[edge["source"]] = degrees_out.get(edge["source"], 0) + 1
        degrees_in[edge["target"]] = degrees_in.get(edge["target"], 0) + 1

    # Indexes
    neighbors = {node: sorted(g.neighbors(node)) for node in g.nodes}
    strong_map: dict[str, list[str]] = {}
    weak_map: dict[str, list[str]] = {}
    even_map: dict[str, list[str]] = {}
    for edge in edges:
        rel = edge["type"]
        if rel == "STRONG_AGAINST":
            strong_map.setdefault(edge["source"], []).append(edge["target"])
        elif rel == "WEAK_AGAINST":
            weak_map.setdefault(edge["source"], []).append(edge["target"])
        elif rel == "EVEN_AGAINST":
            even_map.setdefault(edge["source"], []).append(edge["target"])

    mechanic_usage: dict[str, int] = {}
    mechanic_counter: dict[str, int] = {}
    for node in nodes:
        if node["label"] == "Character":
            for mech in node["properties"].get("mechanics_used", []):
                mechanic_usage[mech] = mechanic_usage.get(mech, 0) + 1
            for mech in node["properties"].get("mechanics_countered", []):
                mechanic_counter[mech] = mechanic_counter.get(mech, 0) + 1

    # Metadata summary
    label_distribution = {}
    for node in nodes:
        label_distribution[node["label"]] = label_distribution.get(node["label"], 0) + 1

    archetype_counts = {}
    for node in nodes:
        if node["label"] == "Character":
            archetype = node["properties"].get("archetype")
            if archetype:
                archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1

    mechanic_counts = {}
    for node in nodes:
        if node["label"] == "Mechanic":
            mechanic_counts[node["properties"]["category"]] = (
                mechanic_counts.get(node["properties"]["category"], 0) + 1
            )

    graph_payload = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "node_count": len(nodes),
            "edge_count": len(edges),
            "label_distribution": label_distribution,
            "archetype_counts": archetype_counts,
            "mechanic_category_counts": mechanic_counts,
        },
        "nodes": nodes,
        "edges": edges,
        "indexes": {
            "degrees_in": degrees_in,
            "degrees_out": degrees_out,
            "neighbors": neighbors,
            "strong_against": strong_map,
            "weak_against": weak_map,
            "even_against": even_map,
            "mechanic_usage": mechanic_usage,
            "mechanic_counter": mechanic_counter,
        },
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(graph_payload, indent=2), encoding="utf-8")
    typer.echo(f"Exported graph to {out}")


def main() -> None:  # pragma: no cover
    app()


if __name__ == "__main__":  # pragma: no cover
    main()
