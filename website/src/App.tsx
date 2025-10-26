import { useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import "./App.css";
import { GraphView } from "./GraphView";
import { useGraphStore } from "./state/useGraphStore";
import type { GraphData, GraphEdge, GraphNode } from "./types";

const RELATIONSHIP_OPTIONS = ["STRONG_AGAINST", "WEAK_AGAINST", "EVEN_AGAINST"] as const;

function App() {
  const {
    graphData,
    setGraphData,
    searchTerm,
    setSearchTerm,
    activeLabels,
    toggleLabel,
    activeArchetypes,
    toggleArchetype,
    relationshipFilters,
    toggleRelationship,
    mechanicFilter,
    setMechanicFilter,
    selectedNodeId,
    setSelectedNode,
    fuse,
    clearFilters,
  } = useGraphStore();

  useEffect(() => {
    fetch("graph.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load graph.json (${response.status})`);
        }
        const data = (await response.json()) as GraphData;
        setGraphData(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [setGraphData]);

  const searchResults = useMemo<GraphNode[]>(() => {
    const term = searchTerm.trim();
    if (!term || !fuse) return [];
    return fuse.search(term, { limit: 20 }).map((result) => result.item);
  }, [searchTerm, fuse]);

  const selectedNode = useMemo<GraphNode | null>(() => {
    if (!graphData || !selectedNodeId) return null;
    return graphData.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [graphData, selectedNodeId]);

  const highlightIds = useMemo(() => {
    const ids = new Set<string>();
    searchResults.forEach((node) => ids.add(node.id));
    if (selectedNodeId) ids.add(selectedNodeId);
    return ids;
  }, [searchResults, selectedNodeId]);

  const filteredNodes = useMemo<GraphNode[]>(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((node: GraphNode) => {
      if (!activeLabels.has(node.label)) return false;
      if (activeArchetypes.size > 0 && node.label === "Character") {
        const archetype = node.properties?.archetype as string | undefined;
        if (!archetype || !activeArchetypes.has(archetype)) return false;
      }
      if (mechanicFilter) {
        if (node.label === "Mechanic") {
          const name = node.properties?.name as string | undefined;
          if (name !== mechanicFilter) return false;
        }
        if (node.label === "Character") {
          const uses = (node.properties?.mechanics_used as string[] | undefined) ?? [];
          const counters = (node.properties?.mechanics_countered as string[] | undefined) ?? [];
          if (!uses.includes(mechanicFilter) && !counters.includes(mechanicFilter)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [graphData, activeLabels, activeArchetypes, mechanicFilter]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo<GraphEdge[]>(() => {
    if (!graphData) return [];
    return graphData.edges.filter((edge: GraphEdge) => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false;
      if ((RELATIONSHIP_OPTIONS as readonly string[]).includes(edge.type)) {
        if (relationshipFilters.size > 0 && !relationshipFilters.has(edge.type)) return false;
      }
      if (mechanicFilter && edge.type === "USES_MECHANIC") {
        if (!edge.target.endsWith(`:${mechanicFilter}`)) return false;
      }
      if (mechanicFilter && edge.type === "CHARACTER_COUNTERS_MECHANIC") {
        if (!edge.target.endsWith(`:${mechanicFilter}`)) return false;
      }
      return true;
    });
  }, [graphData, visibleNodeIds, relationshipFilters, mechanicFilter]);

  const archetypeOptions = useMemo<string[]>(() => {
    if (!graphData) return [];
    return Object.keys(graphData.meta.archetype_counts).sort((a, b) => a.localeCompare(b));
  }, [graphData]);

  const mechanicOptions = useMemo<string[]>(() => {
    if (!graphData) return [];
    return graphData.nodes
      .filter((node) => node.label === "Mechanic")
      .map((node) => node.properties?.name as string)
      .sort((a, b) => a.localeCompare(b));
  }, [graphData]);

  const labelOptions = useMemo<string[]>(() => {
    if (!graphData) return [];
    return Object.keys(graphData.meta.label_distribution).sort((a, b) => a.localeCompare(b));
  }, [graphData]);

  if (!graphData) {
    return (
      <div className="App">
        <h1>Deadlock Graph Explorer</h1>
        <p>Loading graph data…</p>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Deadlock Graph Explorer</h1>
        <p>
          Generated: {new Date(graphData.meta.generated_at).toLocaleString()} • Nodes: {graphData.meta.node_count} • Edges: {graphData.meta.edge_count}
        </p>
      </header>
      <main className="layout">
        <aside>
          <section>
            <h2>Search</h2>
            <input
              type="search"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <ul className="search-results">
                {searchResults.length === 0 && <li className="muted">No matches</li>}
                {searchResults.map((node: GraphNode) => (
                  <li key={node.id}>
                    <button type="button" onClick={() => setSelectedNode(node.id)}>
                      {(node.properties?.name as string | undefined) ?? node.id} <span className="muted">({node.label})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>Node Labels</h2>
            <ul>
              {labelOptions.map((label: string) => (
                <li key={label}>
                  <label>
                    <input
                      type="checkbox"
                      checked={activeLabels.has(label)}
                      onChange={() => toggleLabel(label)}
                    />
                    <span className="dot" data-label={label}></span>
                    {label}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Archetypes</h2>
            <ul>
              {archetypeOptions.map((arch: string) => (
                <li key={arch}>
                  <label>
                    <input
                      type="checkbox"
                      checked={activeArchetypes.has(arch)}
                      onChange={() => toggleArchetype(arch)}
                    />
                    {arch} <span className="muted">({graphData.meta.archetype_counts[arch] ?? 0})</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Relationships</h2>
            <ul>
              {RELATIONSHIP_OPTIONS.map((type: string) => (
                <li key={type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={relationshipFilters.has(type)}
                      onChange={() => toggleRelationship(type)}
                    />
                    {type.replace("_", " ")}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Mechanic Filter</h2>
            <select value={mechanicFilter ?? ""} onChange={(event) => setMechanicFilter(event.target.value || null)}>
              <option value="">All mechanics</option>
              {mechanicOptions.map((mechanic: string) => (
                <option key={mechanic} value={mechanic}>
                  {mechanic}
                </option>
              ))}
            </select>
          </section>

          <button type="button" className="clear" onClick={() => clearFilters()}>
            Reset filters
          </button>
        </aside>
        <section className="graph-panel">
          <GraphView
            nodes={filteredNodes}
            edges={filteredEdges}
            highlightIds={highlightIds}
            onNodeSelect={(node) => setSelectedNode(node ? node.id : null)}
          />
          <div className="details">
            <h2>Selection</h2>
            {selectedNode ? (
              <div>
                <strong>{(selectedNode.properties?.name as string | undefined) ?? selectedNode.id}</strong>
                <p className="muted">{selectedNode.label}</p>
                <pre>{JSON.stringify(selectedNode.properties, null, 2)}</pre>
              </div>
            ) : (
              <p className="muted">Click a node to view details.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
