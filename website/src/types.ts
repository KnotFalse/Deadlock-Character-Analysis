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
  label_distribution: Record<string, number>;
  archetype_counts: Record<string, number>;
  mechanic_category_counts: Record<string, number>;
}

export interface GraphIndexes {
  degrees_in: Record<string, number>;
  degrees_out: Record<string, number>;
}

export interface GraphData {
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
  indexes: GraphIndexes;
}
