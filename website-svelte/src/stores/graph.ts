import { writable, derived } from 'svelte/store';
import Fuse from 'fuse.js';
import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import type { GraphData, GraphNode } from '../types';

export const graphData = writable<GraphData | null>(null);
export const graph = writable<Graph | null>(null);

export const searchTerm = writable('');
export const selectedNodeId = writable<string | null>(null);

export const fuse = derived(graphData, (g) => {
  if (!g) return null as Fuse<GraphNode> | null;
  return new Fuse(g.nodes, { keys: ['properties.name','id','label'], threshold: 0.3 });
});

export const searchResults = derived([fuse, searchTerm], ([f, term]) => {
  const t = term.trim();
  if (!f || !t) return [] as GraphNode[];
  return f.search(t, { limit: 20 }).map(r => r.item as GraphNode);
});

export function initGraph(data: GraphData) {
  const g = new Graph({ type: 'undirected' });
  data.nodes.forEach(n => g.addNode(n.id, { raw: n }));
  data.edges.forEach(e => { if (!g.hasEdge(e.id)) g.addEdgeWithKey(e.id, e.source, e.target, { raw: e }); });
  graphData.set(data);
  graph.set(g);
}

export const shortestPath = writable<string[]>([]);

export function computePath(a: string | null, b: string | null) {
  let gVal: Graph | null = null; graph.subscribe(v => gVal = v)();
  if (!gVal || !a || !b || a === b) { shortestPath.set([]); return; }
  try { const p = bidirectional(gVal, a, b) as string[]; shortestPath.set(p ?? []); } catch { shortestPath.set([]); }
}

