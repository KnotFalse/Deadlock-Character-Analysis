# Agent Implementation Plan: Deadlock Character Graph Database (v3 - Final)

> Addendum (2025-10-27): Web App UX/A11y Next Steps
>
> See docs/NEXT-STEPS-UI-UX.md for the current, focused plan to finalize the SvelteKit explorer (bugs, a11y, mobile, and readability). Data pipeline aggregation and strict validation are complete; the remaining work targets UI/UX.

## 0. User Pre-Flight (Manual Steps)

**Objective:** To be executed by the _human user_ before handing off to the agent. This resolves the agent's lack of shell access.

1.  **Create Project Directory:** Create the root folder for this project.
2.  **Create Data Volume:** Inside the root folder, create the data subdirectory: `mkdir neo4j_data`.
3.  **Create `docker-compose.yml`:** In the root folder, create a `docker-compose.yml` file with the following content. (Auth is disabled for local agent-driven development).

    ```yaml
    version: "3.8"

    services:
      neo4j:
        image: neo4j:latest
        container_name: deadlock_graph_db
        ports:
          - "8474:7474"
          - "8687:7687"
        volumes:
          - ./neo4j_data:/data
        environment:
          - NEO4J_AUTH=none
    ```

4.  **Launch Container:** Run `docker-compose up -d`.
5.  **Confirm Access:** Open `http://localhost:8474` in a browser.
6.  **Hand-off:** The environment is now live. The agent can take over.

---

## 1. Primary Goals (Agent)

1.  **Define Schema:** Establish a robust, evidence-based graph data model.
2.  **Ingest Foundations:** Populate the database with foundational concepts (Archetypes, Mechanics).
3.  **Iterative Ingestion:** Iteratively research, analyze, checkpoint, and ingest each character one by one.
4.  **Synthesize Matchups:** Use database queries to infer and create all matchup relationships (Strong, Weak, and Even) based on ingested evidence.
5.  **Enable Maintenance:** Create a data structure that can be easily updated as the game is patched.

---

## 2. Phase 1: Schema Definition & Constraints

**Objective:** Define the complete data model and create database constraints for data integrity.

### Task 2.1: Define Node Labels

- **(Node) `Character`**: A playable character.
  - _Properties_: `name` (string, unique), `description` (string), `source_url` (string), `last_updated` (datetime).
- **(Node) `Ability`**: A character's ability.
  - _Properties_: `name` (string, unique), `description` (string), `type` (string).
- **(Node) `Archetype`**: A character class.
  - _Properties_: `name` (string, unique), `description` (string).
- **(Node) `Mechanic`**: An abstract game concept.
  - _Properties_: `name` (string, unique, e.g., 'Channeling', 'High Mobility', 'Barrier', 'Stun').

### Task 2.2: Define Relationship Types (Edges)

- **Core Relationships:**
  - `[:IS_ARCHETYPE]` -> `(Character)` to `(Archetype)`.
  - `[:HAS_ABILITY]` -> `(Character)` to `(Ability)`.
  - `[:COUNTERS]` -> `(Archetype)` to `(Archetype)`.
- **Evidence Relationships:**
  - `[:USES_MECHANIC]` -> `(Ability)` to `(Mechanic)`.
  - `[:COUNTERS_MECHANIC]` -> `(Ability)` to `(Mechanic)`.
  - `[:CHARACTER_COUNTERS_MECHANIC]` -> `(Character)` to `(Mechanic)`.
- **Synthesized Matchup Relationships:**
  - `[:STRONG_AGAINST]` -> `(Character)` to `(Character)`.
    - _Properties_: `reason` (string), `evidence_count` (int).
  - `[:WEAK_AGAINST]` -> `(Character)` to `(Character)`.
    - _Properties_: `reason` (string), `evidence_count` (int).
  - `[:EVEN_AGAINST]` -> `(Character)` to `(Character)`.
    - _Properties_: `reason` (string).

### Task 2.3: Create Schema Constraints

- **Subtask 2.3.1:** Execute Cypher queries to enforce uniqueness.
  ```cypher
  CREATE CONSTRAINT ON (c:Character) ASSERT c.name IS UNIQUE;
  CREATE CONSTRAINT ON (a:Ability) ASSERT a.name IS UNIQUE;
  CREATE CONSTRAINT ON (arch:Archetype) ASSERT arch.name IS UNIQUE;
  CREATE CONSTRAINT ON (m:Mechanic) ASSERT m.name IS UNIQUE;
  ```

---

## 3. Phase 2: Foundational Data Ingestion

**Objective:** Populate the graph with the core concepts upon which all analysis will be built.

### Task 3.1: Research & Ingest Archetypes

- **Subtask 3.1.1:** Research common MOBA/Hero-Shooter archetypes (e.g., Brawler, Assassin, Marksman).
- **Subtask 3.1.2:** For each, `MERGE` an `(Archetype)` node.
  - _Example Query_: `MERGE (a:Archetype {name: "Brawler"}) SET a.description = "Excels at close-range, sustained fights."`
- **Subtask 3.1.3:** Research and create the high-level `[:COUNTERS]` relationships between them.
  - _Example Query_: `MATCH (a:Archetype {name: "Brawler"}), (b:Archetype {name: "Assassin"}) MERGE (a)-[:COUNTERS]->(b)`

### Task 3.2: Research & Ingest Core Mechanics

- **Subtask 3.2.1:** Research the game "Deadlock" for all known game mechanics (Stun, Slow, Blind, Channeling, Projectile, Hitscan, Mobility, Stealth, Barriers, etc.).
- **Subtask 3.2.2:** For each, `MERGE` a `(Mechanic)` node.
  - _Example Query_: `MERGE (m:Mechanic {name: "Channeling"})`

---

## 4. Phase 3: Iterative Character Ingestion

**Objective:** Iteratively populate the database one character at a time in a fault-tolerant manner.

### Task 4.1: Establish Character List

- **Subtask 4.1.1:** Perform web research to get a list of all known "Deadlock" characters.
- **Subtask 4.1.2:** Store this list locally (e.g., `character_list = ["Haze", "Ivy", "Gargoyle", ...]`).

### Task 4.2: Begin Character Processing Loop

- **Subtask 4.2.1:** For _each_ character in `character_list`:
  1.  **Research & Analyze:** Perform all research for the character:
      - Find `name`, `description`, `source_url`.
      - Determine `Archetype`.
      - For _each_ ability: Find its `name`, `description`, `type`.
      - For _each_ ability: Analyze its description to find all `USES_MECHANIC` and `COUNTERS_MECHANIC` relationships.
  2.  **Checkpoint Data:** Collate all findings from Step 1 into a single, structured object and write it to a temporary file (e.g., `temp_ingest.json`). This creates a safe checkpoint.
  3.  **Parse & Ingest:** Parse the `temp_ingest.json` file. Generate and execute a single, large Cypher transaction to ingest all data for this character.
      - This transaction will:
        - `MERGE` the `(Character)` node and set its properties (including `last_updated: datetime()`).
        - `MATCH` its `(Archetype)` and `MERGE` the `[:IS_ARCHETYPE]` relationship.
        - _For each ability_:
          - `MERGE` the `(Ability)` node.
          - `MERGE` the `(c)-[:HAS_ABILITY]->(ab)` relationship.
          - `MATCH` all relevant `(Mechanic)` nodes and `MERGE` the `[:USES_MECHANIC]` and `[:COUNTERS_MECHANIC]` relationships.
  4.  **Log Completion:** Mark character as "processed" and move to the next.

---

## 5. Phase 4: Matchup Synthesis (Query-Based)

**Objective:** Use the objective evidence in the graph to create all matchup relationships.

### Task 5.1: Clean Slate

- **Subtask 5.1.1:** Before running synthesis, clear all _previous_ synthesized relationships. This ensures that patched data results in a fresh, accurate calculation.
  ```cypher
  MATCH (c:Character)-[r:STRONG_AGAINST|WEAK_AGAINST|EVEN_AGAINST]->()
  DELETE r
  ```

### Task 5.2: Generate STRONG/WEAK Matchups

- **Subtask 5.2.1:** Execute a Cypher query to find all instances where one character's ability counters a mechanic used by another character's ability.
  ```cypher
  // Find all direct ability-vs-ability counters
  MATCH (c1:Character)-[:HAS_ABILITY]->(ab1:Ability),
        (c2:Character)-[:HAS_ABILITY]->(ab2:Ability),
        (ab1)-[:COUNTERS_MECHANIC]->(m),
        (ab2)-[:USES_MECHANIC]->(m)
  WHERE c1 <> c2

  // Create the relationships with evidence
  MERGE (c1)-[r_strong:STRONG_AGAINST]->(c2)
  SET r_strong.reason = coalesce(r_strong.reason, "") +
        "[" + ab1.name + "] counters [" + ab2.name + " via " + m.name + "]. ",
      r_strong.evidence_count = coalesce(r_strong.evidence_count, 0) + 1

  MERGE (c2)-[r_weak:WEAK_AGAINST]->(c1)
  SET r_weak.reason = coalesce(r_weak.reason, "") +
        "[" + ab2.name + "] is countered by [" + ab1.name + " via " + m.name + "]. ",
      r_weak.evidence_count = coalesce(r_weak.evidence_count, 0) + 1
  ```

### Task 5.3: Generate EVEN Matchups

- **Subtask 5.3.1:** Execute a query to find all remaining character pairs that _do not_ have a `STRONG_AGAINST` or `WEAK_AGAINST` relationship and create an `EVEN_AGAINST` link.
  ```cypher
  MATCH (a:Character), (b:Character)
  WHERE a.name < b.name  // Process each pair only once
    AND NOT (a)-[:STRONG_AGAINST|:WEAK_AGAINST]-(b) // Check for relationships in EITHER direction

  MERGE (a)-[r_even:EVEN_AGAINST]->(b)
  SET r_even.reason = "No direct ability or mechanic counters found."
  MERGE (b)-[r_even_b:EVEN_AGAINST]->(a)
  SET r_even_b.reason = "No direct ability or mechanic counters found."
  ```

---

## 6. Phase 5: Validation & Verification

**Objective:** Run queries to find "graph orphans" or gaps in the data, which indicate failed research or ingestion.

### Task 6.1: Execute Validation Queries

- **Subtask 6.1.1:** Run the following queries and report any results. These results represent "to-do" items.
- **Query 1: Characters without an Archetype**
  ```cypher
  MATCH (c:Character)
  WHERE NOT (c)-[:IS_ARCHETYPE]->()
  RETURN c.name AS character_missing_archetype
  ```
- **Query 2: Characters with no Abilities**
  ```cypher
  MATCH (c:Character)
  WHERE NOT (c)-[:HAS_ABILITY]->()
  RETURN c.name AS character_missing_abilities
  ```
- **Query 3: Abilities with no Mechanic Analysis** (Most important validation)
  ```cypher
  MATCH (ab:Ability)
  WHERE NOT (ab)-[:USES_MECHANIC]->() AND NOT (ab)-[:COUNTERS_MECHANIC]->()
  RETURN ab.name AS ability_missing_analysis
  ```

---

## 7. Phase 6: Maintenance & Updates

**Objective:** Define the process for updating the graph as the game changes.

### Task 7.1: Monitor Sources

- **Subtask 7.1.1:** Periodically (e.g., daily, weekly), query the graph for all character `source_url` properties.
  ```cypher
  MATCH (c:Character) RETURN c.name, c.source_url
  ```
- **Subtask 7.1.2:** Visit these URLs to check for patch notes or changes.

### Task 7.2: Process Updates

- **Subtask 7.2.1:** If a character's abilities or mechanics have changed, re-run the **Phase 3** loop _only for that character_.
  - **Note:** This will involve deleting that character's abilities and evidence relationships before re-ingesting, or simply letting the `MERGE` commands update the properties. The `last_updated` property will be set to the current time.
- **Subtask 7.2.2:** If a new character is released, add them to the `character_list` and run the **Phase 3** loop for them.

### Task 7.3: Re-Synthesize Graph

---

## Web Apps (Policy Addendum)

- React (Vite) explorer is the live GitHub Pages site and remains the public reference until SvelteKit reaches parity.
- Svelte 5 + SvelteKit v2 runs as a CSR-only static build (adapter-static) and is previewed via CI artifacts on pull requests. It does not deploy to Pages yet.

### Parity Criteria and Cutover Checklist
- SvelteKit CI enforces schema validation for graph.json and runs the Playwright suite (smoke, neighbor, analytics, mechanic, relationship, keyboard search).
- Docs updated (README and this plan) with policy and commands.
- Export pipeline opens PRs to refresh `website-sveltekit/static/graph.json` with schema gates and SvelteKit build/tests.

When all criteria are consistently green on main, mark the SPA (`website/`) as legacy in README and freeze changes for two weeks before removal/archive.

- **Subtask 7.3.1:** After _any_ update in Task 7.2, the synthesized matchup data is now stale.
- **Subtask 7.3.2:** Re-run **all of Phase 4 (Matchup Synthesis)**. This will clean the old relationships and generate a new, fully accurate set of `STRONG`, `WEAK`, and `EVEN` matchups based on the new evidence.
