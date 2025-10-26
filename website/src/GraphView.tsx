import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { GraphEdge, GraphNode } from "./types";

const labelColors: Record<string, string> = {
  Character: "#2563eb",
  Ability: "#7c3aed",
  Mechanic: "#059669",
  Archetype: "#f97316",
};

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightIds: Set<string>;
  neighborIds?: Set<string>;
  neighborEdgeIds?: Set<string>;
  pathNodeIds?: Set<string>;
  pathEdgeIds?: Set<string>;
  selectedNodeId?: string | null;
  pathStartId?: string | null;
  pathEndId?: string | null;
  selectedEdgeId?: string | null;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeSelect?: (edge: GraphEdge | null) => void;
  metricSizes?: Map<string, number>;
  metricColors?: Map<string, string>;
}

export function GraphView({
  nodes,
  edges,
  highlightIds,
  neighborIds,
  neighborEdgeIds,
  pathNodeIds,
  pathEdgeIds,
  selectedNodeId,
  pathStartId,
  pathEndId,
  selectedEdgeId,
  onNodeSelect,
  onEdgeSelect,
  metricSizes,
  metricColors,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const lightMode = typeof window !== "undefined" && Boolean((window as any).__GRAPH_LIGHT_MODE__);

  useEffect(() => {
    if (lightMode) {
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      return;
    }

    const g = new Graph({ type: "undirected", allowSelfLoops: true, multi: true });

    nodes.forEach((node) => {
      const color = labelColors[node.label] ?? "#334155";
      const baseSize = typeof node.size === "number" ? node.size : 1.5;
      g.addNode(node.id, {
        label: (node.properties?.name as string | undefined) ?? node.id,
        color,
        baseColor: color,
        size: baseSize,
        baseSize,
        x: node.x ?? Math.random() * 10,
        y: node.y ?? Math.random() * 10,
        raw: node,
      });
    });

    edges.forEach((edge) => {
      if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) {
        return;
      }
      if (g.hasEdge(edge.id)) {
        return;
      }
      const baseColor = edge.type === "STRONG_AGAINST" ? "#dc2626" : edge.type === "WEAK_AGAINST" ? "#2563eb" : "#94a3b8";
      const baseSize = edge.type === "STRONG_AGAINST" ? 2 : 1;
      g.addEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.type,
        color: baseColor,
        baseColor,
        size: baseSize,
        baseSize,
        raw: edge,
      });
    });

    if (containerRef.current) {
      sigmaRef.current?.kill();
      const renderer = new Sigma(g, containerRef.current, {
        renderLabels: true,
      });
      sigmaRef.current = renderer;

      const handleClickNode = (event: { node: string }) => {
        const attributes = g.getNodeAttributes(event.node);
        const raw = attributes.raw as GraphNode | undefined;
        onNodeSelect?.(raw ?? null);
        onEdgeSelect?.(null);
      };

      const handleClickEdge = (event: { edge: string }) => {
        const attributes = g.getEdgeAttributes(event.edge);
        const raw = attributes.raw as GraphEdge | undefined;
        onEdgeSelect?.(raw ?? null);
      };

      const handleClickStage = () => {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
      };

      renderer.on("clickNode", handleClickNode);
      renderer.on("clickEdge", handleClickEdge);
      renderer.on("clickStage", handleClickStage);

      return () => {
        renderer.removeListener("clickNode", handleClickNode);
        renderer.removeListener("clickEdge", handleClickEdge);
        renderer.removeListener("clickStage", handleClickStage);
        renderer.kill();
      };
    }
  }, [nodes, edges, onNodeSelect, onEdgeSelect, lightMode]);

  useEffect(() => {
    if (lightMode) {
      return;
    }

    const renderer = sigmaRef.current;
    if (!renderer) return;

    const graph = renderer.getGraph();
    const neighborSet = neighborIds ?? new Set<string>();
    const pathNodeSet = pathNodeIds ?? new Set<string>();
    const pathEdgeSet = pathEdgeIds ?? new Set<string>();
    const neighborEdgeSet = neighborEdgeIds ?? new Set<string>();
    const highlightActive = highlightIds.size > 0;
    const metricSizeMap = metricSizes ?? new Map<string, number>();
    const metricColorMap = metricColors ?? new Map<string, string>();

    graph.forEachNode((nodeKey) => {
      const baseColor = graph.getNodeAttribute(nodeKey, "baseColor") as string;
      const baseSize = (graph.getNodeAttribute(nodeKey, "baseSize") as number) ?? 1.5;
      let color = metricColorMap.get(nodeKey) ?? baseColor;
      let size = metricSizeMap.get(nodeKey) ?? baseSize;

      if (highlightActive) {
        color = highlightIds.has(nodeKey) ? "#60a5fa" : "#cbd5f5";
      }

      if (neighborSet.has(nodeKey)) {
        color = "#34d399";
        size = baseSize + 0.9;
      }

      if (pathNodeSet.has(nodeKey)) {
        color = "#facc15";
        size = baseSize + 1.1;
      }

      if (selectedNodeId && nodeKey === selectedNodeId) {
        color = "#f97316";
        size = baseSize + 1.3;
      }

      if (pathStartId && nodeKey === pathStartId) {
        color = "#38bdf8";
        size = baseSize + 1.5;
      }

      if (pathEndId && nodeKey === pathEndId) {
        color = "#ef4444";
        size = baseSize + 1.5;
      }

      graph.setNodeAttribute(nodeKey, "color", color);
      graph.setNodeAttribute(nodeKey, "size", size);
    });

    graph.forEachEdge((edgeKey) => {
      const baseColor = graph.getEdgeAttribute(edgeKey, "baseColor") as string;
      const baseSize = (graph.getEdgeAttribute(edgeKey, "baseSize") as number) ?? 1;
      const attributes = graph.getEdgeAttributes(edgeKey);
      const raw = attributes.raw as GraphEdge;
      let color = baseColor;
      let size = baseSize;

      if (highlightActive) {
        const sourceHighlighted = highlightIds.has(raw.source);
        const targetHighlighted = highlightIds.has(raw.target);
        color = sourceHighlighted && targetHighlighted ? baseColor : "#e2e8f0";
      }

      if (neighborEdgeSet.has(raw.id)) {
        color = "#34d399";
        size = Math.max(size, baseSize + 0.75);
      }

      if (pathEdgeSet.has(raw.id)) {
        color = "#facc15";
        size = Math.max(size, baseSize + 1);
      }

      if (selectedEdgeId && raw.id === selectedEdgeId) {
        color = "#f97316";
        size = Math.max(size, baseSize + 1.25);
      }

      graph.setEdgeAttribute(edgeKey, "color", color);
      graph.setEdgeAttribute(edgeKey, "size", size);
    });
  }, [
    highlightIds,
    neighborIds,
    neighborEdgeIds,
    pathNodeIds,
    pathEdgeIds,
    selectedNodeId,
    pathStartId,
    pathEndId,
    selectedEdgeId,
    metricSizes,
    metricColors,
    lightMode,
  ]);

  if (lightMode) {
    return (
      <div
        style={{
          width: "100%",
          height: "600px",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          display: "grid",
          placeItems: "center",
          backgroundColor: "#f8fafc",
          color: "#64748b",
          textAlign: "center",
          padding: "1rem",
        }}
        data-testid="graph-light-mode"
      >
        <div>
          <p>Graph rendering disabled for CI run.</p>
          <p className="muted small">Interactive canvas loads in standard builds.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: "600px", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }} />;
}
