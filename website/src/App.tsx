import { Fragment, useCallback, useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import "./App.css";
import { GraphView } from "./GraphView";
import { useGraphStore, type MetricMode } from "./state/useGraphStore";
import type { GraphEdge, GraphNode } from "./types";

const RELATIONSHIP_OPTIONS = ["STRONG_AGAINST", "WEAK_AGAINST", "EVEN_AGAINST"] as const;

const METRIC_OPTIONS: Array<{ value: MetricMode; label: string; description: string }> = [
  { value: "default", label: "Default", description: "Node colors reflect entity type; sizes use static layout values." },
  { value: "outDegree", label: "Out-Degree", description: "Highlights characters with the most outgoing relationships." },
  { value: "strongCount", label: "Strong Matchups", description: "Emphasizes characters that counter many opponents." },
  { value: "mechanicUsage", label: "Mechanic Usage", description: "Rescales mechanic nodes by how many characters use them." },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const interpolateColor = (start: string, end: string, factor: number) => {
  const s = start.replace("#", "");
  const e = end.replace("#", "");
  const sr = parseInt(s.substring(0, 2), 16);
  const sg = parseInt(s.substring(2, 4), 16);
  const sb = parseInt(s.substring(4, 6), 16);
  const er = parseInt(e.substring(0, 2), 16);
  const eg = parseInt(e.substring(2, 4), 16);
  const eb = parseInt(e.substring(4, 6), 16);
  const r = Math.round(sr + (er - sr) * factor);
  const g = Math.round(sg + (eg - sg) * factor);
  const b = Math.round(sb + (eb - sb) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

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
  selectedEdgeId,
  setSelectedEdge,
  fuse,
  clearFilters,
  neighborMode,
  setNeighborMode,
  pathStart,
  pathEnd,
  setPathStart,
  setPathEnd,
  clearPath,
  pathNodes,
  pathEdges,
  metricMode,
  setMetricMode,
  characterRankings,
  mechanicUsageRanking,
  characterMetrics,
} = useGraphStore();

  useEffect(() => {
    fetch("graph.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load graph.json (${response.status})`);
        }
        const data = await response.json();
        setGraphData(data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [setGraphData]);

  useEffect(() => {
    if (!selectedNodeId && neighborMode) {
      setNeighborMode(false);
    }
  }, [selectedNodeId, neighborMode, setNeighborMode]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphData?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphData]);

  const getNodeLabel = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "";
      const node = nodeMap.get(id);
      if (!node) return id;
      const name = node.properties?.name as string | undefined;
      return name ?? id;
    },
    [nodeMap]
  );

  const humanizeLabel = useCallback((value: string) => {
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const extractEvidence = useCallback((edge: GraphEdge) => {
    const value = edge.properties?.evidence;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const searchResults = useMemo<GraphNode[]>(() => {
    const term = searchTerm.trim();
    if (!term || !fuse) return [];
    return fuse.search(term, { limit: 20 }).map((result) => result.item);
  }, [searchTerm, fuse]);

  const selectedNode = useMemo<GraphNode | null>(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) ?? null;
  }, [selectedNodeId, nodeMap]);

  const selectedEdge = useMemo<GraphEdge | null>(() => {
    if (!selectedEdgeId || !graphData) return null;
    return graphData.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  }, [selectedEdgeId, graphData]);

  const neighborIds = useMemo(() => {
    if (!neighborMode || !graphData || !selectedNodeId) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    ids.add(selectedNodeId);
    const neighbors = graphData.indexes.neighbors[selectedNodeId] ?? [];
    neighbors.forEach((id) => ids.add(id));
    return ids;
  }, [neighborMode, graphData, selectedNodeId]);

  const neighborEdgeIds = useMemo(() => {
    if (!neighborMode || !graphData || !selectedNodeId) {
      return new Set<string>();
    }
    const neighborSet = new Set(graphData.indexes.neighbors[selectedNodeId] ?? []);
    const edges = new Set<string>();
    graphData.edges.forEach((edge) => {
      const connectsSelected =
        (edge.source === selectedNodeId && neighborSet.has(edge.target)) ||
        (edge.target === selectedNodeId && neighborSet.has(edge.source));
      if (connectsSelected) {
        edges.add(edge.id);
      }
    });
    return edges;
  }, [neighborMode, graphData, selectedNodeId]);

  const connectedRelationshipEdges = useMemo<GraphEdge[]>(() => {
    if (!graphData || !selectedNodeId) return [];
    return graphData.edges.filter(
      (edge) =>
        (edge.source === selectedNodeId || edge.target === selectedNodeId) &&
        (RELATIONSHIP_OPTIONS as readonly string[]).includes(edge.type)
    );
  }, [graphData, selectedNodeId]);

  const pathNodeIds = useMemo(() => new Set(pathNodes), [pathNodes]);
  const pathEdgeIds = useMemo(() => new Set(pathEdges), [pathEdges]);

  const pinnedIds = useMemo(() => {
    const pinned = new Set<string>();
    pathNodes.forEach((id) => pinned.add(id));
    neighborIds.forEach((id) => pinned.add(id));
    if (selectedNodeId) pinned.add(selectedNodeId);
    if (pathStart) pinned.add(pathStart);
    if (pathEnd) pinned.add(pathEnd);
    if (selectedEdge) {
      pinned.add(selectedEdge.source);
      pinned.add(selectedEdge.target);
    }
    return pinned;
  }, [pathNodes, neighborIds, selectedNodeId, pathStart, pathEnd, selectedEdge]);

  const filteredNodes = useMemo<GraphNode[]>(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((node) => {
      if (pinnedIds.has(node.id)) return true;
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
  }, [graphData, pinnedIds, activeLabels, activeArchetypes, mechanicFilter]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo<GraphEdge[]>(() => {
    if (!graphData) return [];
    return graphData.edges.filter((edge) => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false;
      const isSelectedEdge = selectedEdgeId === edge.id;
      if ((RELATIONSHIP_OPTIONS as readonly string[]).includes(edge.type)) {
        if (!isSelectedEdge && relationshipFilters.size > 0 && !relationshipFilters.has(edge.type)) return false;
      }
      if (mechanicFilter && edge.type === "USES_MECHANIC") {
        if (!isSelectedEdge && !edge.target.endsWith(`:${mechanicFilter}`)) return false;
      }
      if (mechanicFilter && edge.type === "CHARACTER_COUNTERS_MECHANIC") {
        if (!isSelectedEdge && !edge.target.endsWith(`:${mechanicFilter}`)) return false;
      }
      return true;
    });
  }, [graphData, visibleNodeIds, relationshipFilters, mechanicFilter, selectedEdgeId]);

  const highlightIds = useMemo(() => {
    const ids = new Set<string>();
    searchResults.forEach((node) => ids.add(node.id));
    pinnedIds.forEach((id) => ids.add(id));
    if (selectedEdge) {
      ids.add(selectedEdge.source);
      ids.add(selectedEdge.target);
    }
    return ids;
  }, [searchResults, pinnedIds, selectedEdge]);

  const relationshipGroups = useMemo(() => {
    if (!selectedNodeId) return [];
    const grouped = new Map<string, GraphEdge[]>();
    connectedRelationshipEdges.forEach((edge) => {
      const list = grouped.get(edge.type) ?? [];
      list.push(edge);
      grouped.set(edge.type, list);
    });
    const entries: { type: string; edges: GraphEdge[] }[] = [];
    (RELATIONSHIP_OPTIONS as readonly string[]).forEach((type) => {
      const edges = grouped.get(type);
      if (!edges || edges.length === 0) return;
      edges.sort((a, b) => {
        const otherA = a.source === selectedNodeId ? a.target : a.source;
        const otherB = b.source === selectedNodeId ? b.target : b.source;
        return getNodeLabel(otherA).localeCompare(getNodeLabel(otherB));
      });
      entries.push({ type, edges });
    });
    return entries;
  }, [connectedRelationshipEdges, selectedNodeId, getNodeLabel]);

  const selectedEdgeReason = useMemo(() => {
    if (!selectedEdge) return null;
    const reason = selectedEdge.properties?.reason;
    if (typeof reason === "string" && reason.trim().length > 0) {
      return reason.trim();
    }
    return null;
  }, [selectedEdge]);

  const selectedEdgeEvidence = useMemo(() => {
    if (!selectedEdge) return null;
    return extractEvidence(selectedEdge);
  }, [selectedEdge, extractEvidence]);

  const selectedEdgeExtraProps = useMemo(() => {
    if (!selectedEdge) return [];
    return Object.entries(selectedEdge.properties ?? {})
      .filter(([key]) => key !== "reason" && key !== "evidence")
      .filter(([, value]) => typeof value === "string" || typeof value === "number")
      .map(([key, value]) => ({
        key,
        value: String(value),
      }));
  }, [selectedEdge]);

  const selectedNodeMetrics = useMemo(() => {
    if (!selectedNodeId) return null;
    return characterMetrics[selectedNodeId] ?? null;
  }, [selectedNodeId, characterMetrics]);

  const topOutDegree = useMemo(() => {
    return characterRankings.outDegree.filter((entry) => entry.value > 0).slice(0, 10);
  }, [characterRankings]);

  const topStrong = useMemo(() => {
    return characterRankings.strongCount.filter((entry) => entry.value > 0).slice(0, 10);
  }, [characterRankings]);

  const topMechanics = useMemo(() => {
    return mechanicUsageRanking.filter((entry) => entry.usage > 0).slice(0, 10);
  }, [mechanicUsageRanking]);

  const topMechanicEntries = useMemo(
    () =>
      topMechanics.map((entry) => ({
        name: entry.name,
        usage: entry.usage,
        counter: entry.counter,
      })),
    [topMechanics]
  );

  const neighborList = useMemo(() => {
    if (!graphData || !neighborMode || !selectedNodeId) return [];
    return [...neighborIds]
      .filter((id) => id !== selectedNodeId)
      .map((id) => ({
        id,
        label: getNodeLabel(id),
        type: nodeMap.get(id)?.label ?? "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [graphData, neighborMode, neighborIds, selectedNodeId, getNodeLabel, nodeMap]);

  const metricLegend = useMemo(() => {
    const active = METRIC_OPTIONS.find((option) => option.value === metricMode);
    return active?.description ?? METRIC_OPTIONS[0]?.description ?? "";
  }, [metricMode]);

  const handleMetricModeChange = useCallback(
    (next: MetricMode) => {
      if (metricMode === next) return;
      setMetricMode(next);
    },
    [metricMode, setMetricMode]
  );

  const topOutDegreeNodes = useMemo(
    () =>
      topOutDegree.map((entry) => ({
        id: entry.id,
        label: getNodeLabel(entry.id),
        value: entry.value,
      })),
    [topOutDegree, getNodeLabel]
  );

  const topStrongNodes = useMemo(
    () =>
      topStrong.map((entry) => ({
        id: entry.id,
        label: getNodeLabel(entry.id),
        value: entry.value,
      })),
    [topStrong, getNodeLabel]
  );

  const metricSizes = useMemo(() => {
    const sizeMap = new Map<string, number>();
    if (!graphData) return sizeMap;
    if (metricMode === "outDegree" || metricMode === "strongCount") {
      const ranking = metricMode === "outDegree" ? characterRankings.outDegree : characterRankings.strongCount;
      const maxValue = ranking[0]?.value ?? 0;
      if (maxValue <= 0) return sizeMap;
      ranking.forEach((entry) => {
        const node = nodeMap.get(entry.id);
        if (!node) return;
        const baseSize = typeof node.size === "number" ? node.size : 1.5;
        const scale = clamp(entry.value / maxValue);
        sizeMap.set(entry.id, baseSize + 1.2 * scale);
      });
    } else if (metricMode === "mechanicUsage") {
      const maxValue = topMechanics[0]?.usage ?? 0;
      if (maxValue <= 0) return sizeMap;
      graphData.nodes.forEach((node) => {
        if (node.label !== "Mechanic") return;
        const name = node.properties?.name as string | undefined;
        if (!name) return;
        const record = mechanicUsageRanking.find((metric) => metric.name === name);
        if (!record || record.usage <= 0) return;
        const baseSize = typeof node.size === "number" ? node.size : 1.5;
        const scale = clamp(record.usage / maxValue);
        sizeMap.set(node.id, baseSize + 1.5 * scale);
      });
    }
    return sizeMap;
  }, [graphData, metricMode, characterRankings, topMechanics, nodeMap, mechanicUsageRanking]);

  const metricColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    if (metricMode === "outDegree") {
      const maxValue = characterRankings.outDegree[0]?.value ?? 0;
      if (maxValue > 0) {
        characterRankings.outDegree.forEach((entry) => {
          if (entry.value <= 0) return;
          const factor = clamp(entry.value / maxValue);
          colorMap.set(entry.id, interpolateColor("#bfdbfe", "#1d4ed8", factor));
        });
      }
    } else if (metricMode === "strongCount") {
      const maxValue = characterRankings.strongCount[0]?.value ?? 0;
      if (maxValue > 0) {
        characterRankings.strongCount.forEach((entry) => {
          if (entry.value <= 0) return;
          const factor = clamp(entry.value / maxValue);
          colorMap.set(entry.id, interpolateColor("#fecaca", "#b91c1c", factor));
        });
      }
    } else if (metricMode === "mechanicUsage") {
      const maxValue = mechanicUsageRanking[0]?.usage ?? 0;
      if (maxValue > 0) {
        mechanicUsageRanking.forEach((entry) => {
          if (entry.usage <= 0) return;
          const factor = clamp(entry.usage / maxValue);
          const matchingNode = graphData?.nodes.find(
            (node) => node.label === "Mechanic" && (node.properties?.name as string | undefined) === entry.name
          );
          if (matchingNode) {
            colorMap.set(matchingNode.id, interpolateColor("#bbf7d0", "#047857", factor));
          }
        });
      }
    }
    return colorMap;
  }, [metricMode, characterRankings, mechanicUsageRanking, graphData]);


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

  const groupedNodeOptions = useMemo(() => {
    if (!graphData) return {} as Record<string, GraphNode[]>;
    const groups: Record<string, GraphNode[]> = {};
    graphData.nodes.forEach((node) => {
      if (!groups[node.label]) {
        groups[node.label] = [];
      }
      groups[node.label].push(node);
    });
    Object.keys(groups).forEach((label) => {
      groups[label].sort((a, b) => getNodeLabel(a.id).localeCompare(getNodeLabel(b.id)));
    });
    return groups;
  }, [graphData, getNodeLabel]);

  const pathUnavailable = useMemo(() => {
    if (!pathStart || !pathEnd) return false;
    if (pathStart === pathEnd) return true;
    return pathNodes.length === 0;
  }, [pathStart, pathEnd, pathNodes]);

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
          Generated: {new Date(graphData.meta.generated_at).toLocaleString()} • Nodes: {graphData.meta.node_count} • Edges:{" "}
          {graphData.meta.edge_count}
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
                      {getNodeLabel(node.id)} <span className="muted">({node.label})</span>
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
                    <input type="checkbox" checked={activeLabels.has(label)} onChange={() => toggleLabel(label)} />
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
                    <input type="checkbox" checked={activeArchetypes.has(arch)} onChange={() => toggleArchetype(arch)} />
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
                    <input type="checkbox" checked={relationshipFilters.has(type)} onChange={() => toggleRelationship(type)} />
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

          <section className="path-controls">
            <h2>Path Tools</h2>
            <label className="muted" htmlFor="path-start">
              Start node
            </label>
            <select
              id="path-start"
              value={pathStart ?? ""}
              onChange={(event) => setPathStart(event.target.value || null)}
            >
              <option value="">Select start…</option>
              {labelOptions.map((label) => {
                const group = groupedNodeOptions[label];
                if (!group || group.length === 0) return null;
                return (
                  <optgroup key={label} label={label}>
                    {group.map((node) => (
                      <option key={node.id} value={node.id}>
                        {getNodeLabel(node.id)} ({label})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            <label className="muted" htmlFor="path-end">
              End node
            </label>
            <select id="path-end" value={pathEnd ?? ""} onChange={(event) => setPathEnd(event.target.value || null)}>
              <option value="">Select end…</option>
              {labelOptions.map((label) => {
                const group = groupedNodeOptions[label];
                if (!group || group.length === 0) return null;
                return (
                  <optgroup key={label} label={label}>
                    {group.map((node) => (
                      <option key={node.id} value={node.id}>
                        {getNodeLabel(node.id)} ({label})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            <div className="path-actions">
              <button type="button" className="secondary" disabled={!selectedNodeId} onClick={() => selectedNodeId && setPathStart(selectedNodeId)}>
                Use selection as start
              </button>
              <button type="button" className="secondary" disabled={!selectedNodeId} onClick={() => selectedNodeId && setPathEnd(selectedNodeId)}>
                Use selection as end
              </button>
              <button type="button" className="secondary" onClick={() => clearPath()}>
                Clear path
              </button>
            </div>
            {pathUnavailable && <p className="error">No connection found between the chosen nodes.</p>}
          </section>

          <section>
            <h2>Neighbor Highlight</h2>
            <label>
              <input
                type="checkbox"
                checked={neighborMode}
                disabled={!selectedNodeId}
                onChange={() => setNeighborMode(!neighborMode)}
              />
              Highlight immediate neighbors of the current selection
            </label>
            {!selectedNodeId && <p className="muted">Select a node to enable neighbor highlights.</p>}
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
            neighborIds={neighborIds}
            neighborEdgeIds={neighborEdgeIds}
            pathNodeIds={pathNodeIds}
            pathEdgeIds={pathEdgeIds}
            selectedNodeId={selectedNodeId}
            pathStartId={pathStart}
            pathEndId={pathEnd}
            selectedEdgeId={selectedEdgeId}
            metricSizes={metricSizes}
            metricColors={metricColors}
            onNodeSelect={(node) => setSelectedNode(node ? node.id : null)}
            onEdgeSelect={(edge) => setSelectedEdge(edge ? edge.id : null)}
          />
          <div className="details">
            <h2>Selection</h2>
            {selectedNode ? (
              <div className="selection-summary">
                <strong>{getNodeLabel(selectedNode.id)}</strong>
                <p className="muted">{selectedNode.label}</p>
                <pre>{JSON.stringify(selectedNode.properties, null, 2)}</pre>
              </div>
            ) : (
              <p className="muted">Click a node to view details.</p>
            )}

            {selectedNode && (
              <div className="relationship-summary">
                <h3>Matchup Relationships</h3>
                {selectedNodeMetrics && (
                  <p className="muted small">
                    Strong: {selectedNodeMetrics.strong} • Weak: {selectedNodeMetrics.weak} • Even: {selectedNodeMetrics.even} • Out-Degree:{" "}
                    {selectedNodeMetrics.outDegree}
                  </p>
                )}
                {relationshipGroups.length > 0 ? (
                  relationshipGroups.map(({ type, edges }) => (
                    <div key={type} className="relationship-group">
                      <p className="muted">{humanizeLabel(type)}</p>
                      <ul>
                        {edges.map((edge) => {
                          const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
                          const direction = edge.source === selectedNodeId ? "→" : "←";
                          const otherLabel = getNodeLabel(otherId);
                          const isActive = selectedEdge?.id === edge.id;
                          const evidence = extractEvidence(edge);
                          return (
                            <li key={edge.id}>
                              <button
                                type="button"
                                className={`link-button relationship${isActive ? " active" : ""}`}
                                onClick={() => setSelectedEdge(edge.id)}
                              >
                                {direction} {otherLabel}
                                {evidence !== null ? <span className="muted"> • {evidence}</span> : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="muted">No matchup edges recorded yet.</p>
                )}
              </div>
            )}

            {selectedEdge && (
              <div className="edge-summary">
                <div className="edge-summary__header">
                  <h3>Relationship Detail</h3>
                  <button type="button" className="secondary" onClick={() => setSelectedEdge(null)}>
                    Clear
                  </button>
                </div>
                <p className="muted">
                  {humanizeLabel(selectedEdge.type)} • {getNodeLabel(selectedEdge.source)} → {getNodeLabel(selectedEdge.target)}
                </p>
                {selectedEdgeReason ? (
                  <p>{selectedEdgeReason}</p>
                ) : (
                  <p className="muted">No narrative reason provided.</p>
                )}
                <dl className="edge-meta">
                  <dt>Source</dt>
                  <dd>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setSelectedNode(selectedEdge.source)}
                    >
                      {getNodeLabel(selectedEdge.source)}
                    </button>
                  </dd>
                  <dt>Target</dt>
                  <dd>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setSelectedNode(selectedEdge.target)}
                    >
                      {getNodeLabel(selectedEdge.target)}
                    </button>
                  </dd>
                  {selectedEdgeEvidence !== null && (
                    <>
                      <dt>Evidence Count</dt>
                      <dd>{selectedEdgeEvidence}</dd>
                    </>
                  )}
                  {selectedEdgeExtraProps.length > 0
                    ? selectedEdgeExtraProps.map(({ key, value }) => (
                        <Fragment key={key}>
                          <dt>{humanizeLabel(key)}</dt>
                          <dd>{value}</dd>
                        </Fragment>
                      ))
                    : null}
                </dl>
              </div>
            )}

            <div className="analytics-panel">
              <div className="analytics-header">
                <h3>Analytics</h3>
                <div className="metric-toggle">
                  {METRIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`toggle-button${metricMode === option.value ? " active" : ""}`}
                      onClick={() => handleMetricModeChange(option.value)}
                      aria-pressed={metricMode === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="muted small">{metricLegend}</p>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Top Out-Degree</h4>
                  {topOutDegreeNodes.length > 0 ? (
                    <ol>
                      {topOutDegreeNodes.map((entry) => (
                        <li key={entry.id}>
                          <div className="metric-row">
                            <button type="button" className="link-button" onClick={() => setSelectedNode(entry.id)}>
                              {entry.label}
                            </button>
                            <span className="metric-value">{entry.value}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">No outgoing relationships recorded yet.</p>
                  )}
                </div>
                <div className="analytics-card">
                  <h4>Top Strong Matchups</h4>
                  {topStrongNodes.length > 0 ? (
                    <ol>
                      {topStrongNodes.map((entry) => (
                        <li key={entry.id}>
                          <div className="metric-row">
                            <button type="button" className="link-button" onClick={() => setSelectedNode(entry.id)}>
                              {entry.label}
                            </button>
                            <span className="metric-value">{entry.value}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">No strong counters synthesized yet.</p>
                  )}
                </div>
                <div className="analytics-card">
                  <h4>Mechanic Usage</h4>
                  {topMechanicEntries.length > 0 ? (
                    <ol>
                      {topMechanicEntries.map((entry) => (
                        <li key={entry.name}>
                          <div className="metric-row">
                            <button type="button" className="link-button" onClick={() => setMechanicFilter(entry.name)}>
                              {entry.name}
                            </button>
                            <span className="metric-value">{entry.usage}</span>
                          </div>
                          <p className="metric-caption">
                            Counters: {entry.counter}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">Mechanic usage data not available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="path-summary">
              <h3>Shortest Path</h3>
              {pathNodes.length > 0 ? (
                <>
                  <p className="muted">
                    {pathNodes.length - 1} edge{pathNodes.length - 1 === 1 ? "" : "s"}
                  </p>
                  <ol className="path-list">
                    {pathNodes.map((id) => (
                      <li key={id}>
                        <button type="button" className="link-button" onClick={() => setSelectedNode(id)}>
                          {getNodeLabel(id)} <span className="muted">({nodeMap.get(id)?.label ?? "Unknown"})</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="muted">
                  {pathStart && pathEnd
                    ? "No valid path. Adjust filters or choose different nodes."
                    : "Choose a start and end node to compute a path."}
                </p>
              )}
            </div>

            {neighborMode && neighborList.length > 0 && (
              <div className="neighbor-summary">
                <h3>Immediate Neighbors</h3>
                <ul>
                  {neighborList.map((neighbor) => (
                    <li key={neighbor.id}>
                      <button type="button" className="link-button" onClick={() => setSelectedNode(neighbor.id)}>
                        {neighbor.label} <span className="muted">({neighbor.type})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
