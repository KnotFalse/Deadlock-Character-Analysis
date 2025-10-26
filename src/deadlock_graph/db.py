from __future__ import annotations

from contextlib import AbstractContextManager, contextmanager
from typing import Any, Callable, Generator

from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError


class Neo4jClient:
    def __init__(self, uri: str, auth: tuple[str, str] | None = None) -> None:
        self._driver = GraphDatabase.driver(uri, auth=auth)

    def close(self) -> None:
        self._driver.close()

    @contextmanager
    def session(self) -> Generator[AbstractContextManager, None, None]:
        session = self._driver.session()
        try:
            yield session
        finally:
            session.close()

    def execute(self, cypher: str, parameters: dict[str, Any] | None = None) -> None:
        with self.session() as session:
            session.run(cypher, parameters or {})

    def execute_tx(
        self,
        work: Callable[[Any], Any],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        with self.session() as session:
            try:
                return session.execute_write(work, metadata=metadata or {})
            except Neo4jError as exc:
                raise RuntimeError(f"Neo4j transaction failed: {exc}") from exc
