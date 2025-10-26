import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { GraphView } from "./GraphView";

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
  size: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphMeta {
  generated_at: string;
  node_count: number;
  edge_count: number;
}

export interface GraphData {
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("graph.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load graph.json (${response.status})`);
        }
        const data = (await response.json()) as GraphData;
        setGraph(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, []);

  const labelCounts = useMemo(() => {
    if (!graph) return [] as Array<{ label: string; count: number }>;
    const counts = new Map<string, number>();
    graph.nodes.forEach((node) => {
      counts.set(node.label, (counts.get(node.label) ?? 0) + 1);
    });
    return (Array.from(counts.entries()).map(([label, count]) => ({ label, count })) as Array<{ label: string; count: number }>);
  }, [graph]);

  if (error) {
    return (
      <div className="App">
        <h1>Deadlock Graph Explorer</h1>
        <p className="error">Failed to load graph data: {error}</p>
      </div>
    );
  }

  if (!graph) {
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
          Generated: {new Date(graph.meta.generated_at).toLocaleString()} • Nodes: {graph.meta.node_count} • Edges: {graph.meta.edge_count}
        </p>
      </header>
      <main className="layout">
        <aside>
          <h2>Labels</h2>
          <ul>
            {labelCounts.map(({ label, count }) => (
              <li key={label}>
                <span className="dot" data-label={label}></span>
                {label} <span className="muted">({count})</span>
              </li>
            ))}
          </ul>
          <section className="details">
            <h2>Selection</h2>
            {selectedNode ? (
              <div>
                <strong>{(typeof selectedNode.properties?.name === 'string' ? selectedNode.properties.name : selectedNode.id)}</strong>
                <p className="muted">{selectedNode.label}</p>
                <pre>{JSON.stringify(selectedNode.properties, null, 2)}</pre>
              </div>
            ) : (
              <p className="muted">Click a node to view details.</p>
            )}
          </section>
        </aside>
        <section className="graph-panel">
          <GraphView graphData={graph} onNodeSelect={(node) => setSelectedNode(node)} />
        </section>
      </main>
    </div>
  );
}

export default App;



