from __future__ import annotations

from contextlib import closing
from pathlib import Path
from typing import Optional

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


def main() -> None:  # pragma: no cover
    app()


if __name__ == "__main__":  # pragma: no cover
    main()
