import { create } from 'zustand';
import Fuse from 'fuse.js';
import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import type { GraphData, GraphEdge, GraphNode } from '../types';

export type MetricMode = 'default' | 'outDegree' | 'strongCount' | 'mechanicUsage';

interface CharacterMetric {
  outDegree: number;
  strong: number;
  weak: number;
  even: number;
}

interface CharacterRankingEntry {
  id: string;
  value: number;
}

interface MechanicMetric {
  name: string;
  usage: number;
  counter: number;
}

interface FilterState {
  searchTerm: string;
  activeLabels: Set<string>;
  activeArchetypes: Set<string>;
  relationshipFilters: Set<string>;
  mechanicFilter: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  neighborMode: boolean;
  pathStart: string | null;
  pathEnd: string | null;
  pathNodes: string[];
  pathEdges: string[];
  metricMode: MetricMode;
}

interface GraphStore extends FilterState {
  setSearchTerm: (term: string) => void;
  toggleLabel: (label: string) => void;
  toggleArchetype: (label: string) => void;
  toggleRelationship: (type: string) => void;
  setMechanicFilter: (mechanic: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setNeighborMode: (enabled: boolean) => void;
  setPathStart: (id: string | null) => void;
  setPathEnd: (id: string | null) => void;
  clearPath: () => void;
  setMetricMode: (mode: MetricMode) => void;
  fuse: Fuse<GraphNode> | null;
  graphData: GraphData | null;
  graph: Graph | null;
  characterMetrics: Record<string, CharacterMetric>;
  characterRankings: {
    outDegree: CharacterRankingEntry[];
    strongCount: CharacterRankingEntry[];
  };
  mechanicUsageRanking: MechanicMetric[];
  setGraphData: (data: GraphData) => void;
  clearFilters: () => void;
  computePath: () => void;
}

const DEFAULT_LABELS = new Set(['Character', 'Ability', 'Mechanic', 'Archetype']);

export const useGraphStore = create<GraphStore>()((set, get) => ({
  searchTerm: '',
  activeLabels: new Set(DEFAULT_LABELS),
  activeArchetypes: new Set<string>(),
  relationshipFilters: new Set<string>(),
  mechanicFilter: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  neighborMode: false,
  pathStart: null,
  pathEnd: null,
  pathNodes: [],
  pathEdges: [],
  metricMode: 'default',
  fuse: null,
  graphData: null,
  graph: null,
  characterMetrics: {},
  characterRankings: {
    outDegree: [],
    strongCount: [],
  },
  mechanicUsageRanking: [],
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleLabel: (label) =>
    set((state) => {
      const next = new Set(state.activeLabels);
      next.has(label) ? next.delete(label) : next.add(label);
      return { activeLabels: next };
    }),
  toggleArchetype: (label) =>
    set((state) => {
      const next = new Set(state.activeArchetypes);
      next.has(label) ? next.delete(label) : next.add(label);
      return { activeArchetypes: next };
    }),
  toggleRelationship: (type) =>
    set((state) => {
      const next = new Set(state.relationshipFilters);
      next.has(type) ? next.delete(type) : next.add(type);
      return { relationshipFilters: next };
    }),
  setMechanicFilter: (mechanic) => set({ mechanicFilter: mechanic }),
  setSelectedNode: (id) =>
    set(() => {
      if (typeof window !== 'undefined') {
        (window as any).__GRAPH_SELECTED_NODE__ = id;
      }
      return { selectedNodeId: id, selectedEdgeId: null };
    }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id }),
  setNeighborMode: (enabled) => set({ neighborMode: enabled }),
  setPathStart: (id) => {
    set({ pathStart: id });
    get().computePath();
  },
  setPathEnd: (id) => {
    set({ pathEnd: id });
    get().computePath();
  },
  clearPath: () => set({ pathStart: null, pathEnd: null, pathNodes: [], pathEdges: [] }),
  setMetricMode: (mode) => set({ metricMode: mode }),
  setGraphData: (data) => {
    const graph = new Graph({ type: 'undirected', allowSelfLoops: true });
    data.nodes.forEach((node) => {
      graph.addNode(node.id, { raw: node });
    });
    const seenConnections = new Set<string>();
    data.edges.forEach((edge) => {
      const source = edge.source;
      const target = edge.target;
      const simpleKey = source < target ? `${source}|${target}` : `${target}|${source}`;
      if (seenConnections.has(simpleKey)) {
        return;
      }
      seenConnections.add(simpleKey);
      if (!graph.hasEdge(edge.id)) {
        graph.addEdgeWithKey(edge.id, source, target, { raw: edge });
      }
    });

    const degreesOut = data.indexes.degrees_out ?? {};
    const strongMap = data.indexes.strong_against ?? {};
    const weakMap = data.indexes.weak_against ?? {};
    const evenMap = data.indexes.even_against ?? {};

    const characterMetrics: Record<string, CharacterMetric> = {};
    data.nodes.forEach((node) => {
      if (node.label !== 'Character') {
        return;
      }
      const id = node.id;
      characterMetrics[id] = {
        outDegree: degreesOut[id] ?? 0,
        strong: (strongMap[id] ?? []).length,
        weak: (weakMap[id] ?? []).length,
        even: (evenMap[id] ?? []).length,
      };
    });

    const buildRanking = (selector: (metric: CharacterMetric) => number): CharacterRankingEntry[] =>
      Object.entries(characterMetrics)
        .map(([id, metrics]) => ({ id, value: selector(metrics) }))
        .sort((a, b) => b.value - a.value);

    const characterRankings = {
      outDegree: buildRanking((metric) => metric.outDegree),
      strongCount: buildRanking((metric) => metric.strong),
    };

    const mechanicUsageRanking: MechanicMetric[] = Object.entries(data.indexes.mechanic_usage ?? {})
      .map(([name, usage]) => ({
        name,
        usage,
        counter: data.indexes.mechanic_counter?.[name] ?? 0,
      }))
      .sort((a, b) => b.usage - a.usage);

    set({
      graphData: data,
      graph,
      fuse: new Fuse(data.nodes, {
        keys: ['properties.name', 'properties.description', 'id', 'label', 'properties.archetype'],
        threshold: 0.3,
      }),
      characterMetrics,
      characterRankings,
      mechanicUsageRanking,
      selectedEdgeId: null,
    });
    if (typeof window !== 'undefined') {
      (window as any).__GRAPH_DATA__ = data;
    }
    get().computePath();
  },
  clearFilters: () =>
    set({
      activeLabels: new Set(DEFAULT_LABELS),
      activeArchetypes: new Set<string>(),
      relationshipFilters: new Set<string>(),
      mechanicFilter: null,
      searchTerm: '',
      neighborMode: false,
      pathStart: null,
      pathEnd: null,
      pathNodes: [],
      pathEdges: [],
      metricMode: 'default',
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
  computePath: () => {
    const { graph, pathStart, pathEnd } = get();
    if (!graph || !pathStart || !pathEnd || pathStart === pathEnd) {
      set({ pathNodes: [], pathEdges: [] });
      return;
    }
    try {
      const path = bidirectional(graph, pathStart, pathEnd);
      if (!path || path.length === 0) {
        set({ pathNodes: [], pathEdges: [] });
        return;
      }
      const edges: string[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const edgeKey = graph.edge(path[i], path[i + 1]);
        if (!edgeKey) continue;
        const edgeAttrs = graph.getEdgeAttributes(edgeKey);
        const raw = edgeAttrs.raw as GraphEdge | undefined;
        edges.push(raw?.id ?? String(edgeKey));
      }
      set({ pathNodes: path, pathEdges: edges });
    } catch (error) {
      console.warn('Failed to compute path', error);
      set({ pathNodes: [], pathEdges: [] });
    }
  },
}));
