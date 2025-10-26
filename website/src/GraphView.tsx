import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { GraphData, GraphNode } from "./App";

const labelColors: Record<string, string> = {
  Character: "#2563eb",
  Ability: "#7c3aed",
  Mechanic: "#059669",
  Archetype: "#f97316",
};

interface GraphViewProps {
  graphData: GraphData;
  onNodeSelect?: (node: GraphNode | null) => void;
}

export function GraphView({ graphData, onNodeSelect }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);

  useEffect(() => {
    const g = new Graph({ type: "directed", allowSelfLoops: true, multi: false });

    graphData.nodes.forEach((node) => {
      const color = labelColors[node.label] ?? "#334155";
      g.addNode(node.id, {
        label: (node.properties?.name as string | undefined) ?? node.id,
        color,
        size: node.size,
        x: node.x ?? Math.random() * 10,
        y: node.y ?? Math.random() * 10,
        raw: node,
      });
    });

    graphData.edges.forEach((edge) => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        const color = edge.type === "STRONG_AGAINST" ? "#dc2626" : edge.type === "WEAK_AGAINST" ? "#2563eb" : "#94a3b8";
        g.addEdge(edge.source, edge.target, {
          label: edge.type,
          color,
          size: edge.type === "STRONG_AGAINST" ? 2 : 1,
          raw: edge,
        });
      }
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
      };

      renderer.on("clickNode", handleClickNode);

      return () => {
        renderer.removeListener("clickNode", handleClickNode);
        renderer.kill();
      };
    }
  }, [graphData, onNodeSelect]);

  return <div ref={containerRef} style={{ width: "100%", height: "600px", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }} />;
}
