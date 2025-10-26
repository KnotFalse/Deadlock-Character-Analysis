from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    neo4j_uri: str = Field(..., env="NEO4J_URI")
    neo4j_user: Optional[str] = Field(None, env="NEO4J_USER")
    neo4j_password: Optional[str] = Field(None, env="NEO4J_PASSWORD")
    data_root: Path = Field(Path("data"))
    temp_dir: Path = Field(Path("temp"))
    dry_run: bool = False

    @field_validator("data_root", "temp_dir", mode="before")
    def _expand_paths(cls, value: str | Path) -> Path:
        return Path(value).expanduser().resolve()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    load_dotenv()
    return Settings()
