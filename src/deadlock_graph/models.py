from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, validator


class Mechanic(BaseModel):
    name: str
    category: str
    description: str
    archetype_implications: List[str] = Field(default_factory=list)
    sources: List[HttpUrl | str]


class Archetype(BaseModel):
    name: str
    description: str
    signature_traits: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    sources: List[HttpUrl | str] = Field(default_factory=list)


class AbilityMechanics(BaseModel):
    uses: List[str] = Field(default_factory=list)
    counters: List[str] = Field(default_factory=list)


class CharacterMeta(BaseModel):
    name: str
    archetype: str
    description: str
    source_url: HttpUrl | str
    last_updated: datetime
    aliases: List[str] = Field(default_factory=list)

    @validator("last_updated", pre=True)
    def _parse_last_updated(cls, value: str | datetime) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value))

    @property
    def slug(self) -> str:
        return (
            self.name.lower()
            .replace("&", "and")
            .replace(" ", "_")
            .replace("'", "")
        )


class CharacterAbility(BaseModel):
    name: str
    slot: str
    type: str
    description: str
    mechanics: AbilityMechanics = Field(default_factory=AbilityMechanics)
    notes: Optional[str] = None


class CharacterProfile(BaseModel):
    character: CharacterMeta
    abilities: List[CharacterAbility]


class RosterEntry(BaseModel):
    name: str
    archetype: str
    status: str
    aliases: List[str] = Field(default_factory=list)


class CharacterList(BaseModel):
    meta: dict
    characters: List[RosterEntry]
