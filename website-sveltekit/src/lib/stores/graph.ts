import { writable, derived, get } from 'svelte/store';
import Fuse from 'fuse.js';
import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import type { GraphData, GraphNode, GraphEdge } from '$lib/types';

// Core graph data
export const graphData = writable<GraphData | null>(null);
export const graph = writable<Graph | null>(null);

// Filters & selections
export const searchTerm = writable('');
export const activeLabels = writable<Set<string>>(new Set(['Character','Ability','Mechanic','Archetype']));
export const activeArchetypes = writable<Set<string>>(new Set());
export const relationshipFilters = writable<Set<string>>(new Set());
export const mechanicFilter = writable<string | null>(null);
export const neighborMode = writable(false);
export const selectedNodeId = writable<string | null>(null);
export const selectedEdgeId = writable<string | null>(null);
export const pathStart = writable<string | null>(null);
export const pathEnd = writable<string | null>(null);
export type MetricMode = 'default'|'outDegree'|'strongCount'|'mechanicUsage';
export const metricMode = writable<MetricMode>('default');

// Fuse index
export const fuse = derived(graphData, (g) => {
  if (!g) return null as Fuse<GraphNode> | null;
  return new Fuse(g.nodes, { keys: ['properties.name','properties.description','id','label','properties.archetype'], threshold: 0.3 });
});

export const searchResults = derived([fuse, searchTerm], ([f, term]) => {
  const t = term.trim();
  if (!f || !t) return [] as GraphNode[];
  return f.search(t, { limit: 20 }).map(r => r.item as GraphNode);
});

// Initialize graphology for pathfinding helpers
export function initGraph(data: GraphData) {
  const g = new Graph({ type: 'undirected' });
  data.nodes.forEach(n => g.addNode(n.id, { raw: n }));
  const seen = new Set<string>();
  data.edges.forEach(e => {
    const a = e.source, b = e.target;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!g.hasEdge(e.id)) g.addEdgeWithKey(e.id, a, b, { raw: e });
  });
  graphData.set(data);
  graph.set(g);
}

// Expose selection to window for tests
if (typeof window !== 'undefined') {
  selectedNodeId.subscribe((v)=>{ (window as any).__GRAPH_SELECTED_NODE__ = v; });
}

// Options
export const labelOptions = derived(graphData, g => g ? Object.keys(g.meta.label_distribution).sort((a,b)=>a.localeCompare(b)) : []);
export const archetypeOptions = derived(graphData, g => g ? Object.keys(g.meta.archetype_counts).sort((a,b)=>a.localeCompare(b)) : []);
export const mechanicOptions = derived(graphData, g => g ? g.nodes.filter(n=>n.label==='Mechanic').map(n=>n.properties?.['name'] as string).sort((a,b)=>a.localeCompare(b)) : []);

// Filtering helpers
function hasMechanicForCharacter(node: GraphNode, mech: string): boolean {
  const uses = (node.properties?.['mechanics_used'] as string[]|undefined) ?? [];
  const counters = (node.properties?.['mechanics_countered'] as string[]|undefined) ?? [];
  return uses.includes(mech) || counters.includes(mech);
}

export const filteredNodes = derived([graphData, activeLabels, activeArchetypes, mechanicFilter], ([g, labels, archs, mech]) => {
  if (!g) return [] as GraphNode[];
  return g.nodes.filter(node => {
    if (!labels.has(node.label)) return false;
    if (archs.size>0 && node.label==='Character') {
      const a = node.properties?.['archetype'] as string|undefined;
      if (!a || !archs.has(a)) return false;
    }
    if (mech) {
      if (node.label==='Mechanic') {
        const name = node.properties?.['name'] as string|undefined;
        if (name !== mech) return false;
      }
      if (node.label==='Character' && !hasMechanicForCharacter(node, mech)) return false;
    }
    return true;
  });
});

// Expose filtered count for tests/diagnostics
if (typeof window !== 'undefined') {
  filteredNodes.subscribe(nodes => { (window as any).__GRAPH_FILTERED_NODE_COUNT__ = nodes.length; });
}

export const visibleNodeIds = derived(filteredNodes, nodes => new Set(nodes.map(n => n.id)));

const REL_TYPES = new Set(['STRONG_AGAINST','WEAK_AGAINST','EVEN_AGAINST']);

export const filteredEdges = derived([graphData, visibleNodeIds, relationshipFilters, mechanicFilter, selectedEdgeId], ([g, visIds, rels, mech, selId]) => {
  if (!g) return [] as GraphEdge[];
  return g.edges.filter(edge => {
    if (!visIds.has(edge.source) || !visIds.has(edge.target)) return false;
    const isRel = REL_TYPES.has(edge.type);
    const isSelected = selId === edge.id;
    if (isRel && rels.size>0 && !rels.has(edge.type) && !isSelected) return false;
    if (mech && (edge.type==='USES_MECHANIC' || edge.type==='CHARACTER_COUNTERS_MECHANIC')) {
      if (!edge.target.endsWith(`:${mech}`) && !isSelected) return false;
    }
    return true;
  });
});

// Neighbor sets
export const neighborIds = derived([graphData, selectedNodeId, neighborMode], ([g, sel, on]) => {
  const s = new Set<string>();
  if (!g || !sel || !on) return s;
  s.add(sel);
  const neigh = g.indexes.neighbors[sel] ?? [];
  neigh.forEach(id => s.add(id));
  return s;
});

export const neighborEdgeIds = derived([graphData, selectedNodeId, neighborIds], ([g, sel, nset]) => {
  const edges = new Set<string>();
  if (!g || !sel || nset.size===0) return edges;
  g.edges.forEach(e => {
    if ((e.source===sel && nset.has(e.target)) || (e.target===sel && nset.has(e.source))) edges.add(e.id);
  });
  return edges;
});

// Pathfinding
export const shortestPath = writable<string[]>([]);

export function computePath(a: string | null, b: string | null) {
  const gVal = get(graph);
  if (!gVal || !a || !b || a === b) { shortestPath.set([]); return; }
  try { const p = bidirectional(gVal, a, b) as string[]; shortestPath.set(p ?? []); } catch { shortestPath.set([]); }
}

export function setPathStart(id: string | null) { pathStart.set(id); computePath(get(pathStart), get(pathEnd)); }
export function setPathEnd(id: string | null) { pathEnd.set(id); computePath(get(pathStart), get(pathEnd)); }
export function clearPath() { pathStart.set(null); pathEnd.set(null); shortestPath.set([]); }

export const pathEdgeIds = derived([graphData, shortestPath], ([g, path]) => {
  const ids = new Set<string>();
  if (!g || !path || path.length<2) return ids;
  for (let i=0;i<path.length-1;i++) {
    const a = path[i], b = path[i+1];
    const e = g.edges.find(ed => (ed.source===a && ed.target===b) || (ed.source===b && ed.target===a));
    if (e) ids.add(e.id);
  }
  return ids;
});

// Rankings and metric-driven styling
type RankEntry = { id: string; value: number };
export const characterRankings = derived(graphData, (g) => {
  const out: RankEntry[] = [];
  const strong: RankEntry[] = [];
  if (!g) return { outDegree: out, strongCount: strong };
  Object.keys(g.indexes.degrees_out ?? {}).forEach(id => out.push({ id, value: g.indexes.degrees_out[id] ?? 0 }));
  Object.keys(g.indexes.strong_against ?? {}).forEach(id => strong.push({ id, value: (g.indexes.strong_against[id] ?? []).length }));
  out.sort((a,b)=>b.value-a.value); strong.sort((a,b)=>b.value-a.value);
  return { outDegree: out, strongCount: strong };
});

export const mechanicUsageRanking = derived(graphData, (g) => {
  if (!g) return [] as { name:string; usage:number; counter:number }[];
  return Object.entries(g.indexes.mechanic_usage ?? {})
    .map(([name, usage]) => ({ name, usage, counter: g.indexes.mechanic_counter?.[name] ?? 0 }))
    .sort((a,b)=>b.usage-a.usage);
});

function clamp(v:number,min=0,max=1){return Math.min(max,Math.max(min,v));}
function interp(start:string,end:string,t:number){
  const s=start.replace('#',''); const e=end.replace('#','');
  const sr=parseInt(s.slice(0,2),16), sg=parseInt(s.slice(2,4),16), sb=parseInt(s.slice(4,6),16);
  const er=parseInt(e.slice(0,2),16), eg=parseInt(e.slice(2,4),16), eb=parseInt(e.slice(4,6),16);
  const r=Math.round(sr+(er-sr)*t), g=Math.round(sg+(eg-sg)*t), b=Math.round(sb+(eb-sb)*t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

export const metricSizes = derived([metricMode, characterRankings, mechanicUsageRanking, graphData], ([mode, ranks, mech, g]) => {
  const map = new Map<string, number>(); if (!g) return map;
  if (mode==='outDegree' || mode==='strongCount'){
    const list = mode==='outDegree' ? ranks.outDegree : ranks.strongCount; const max=list[0]?.value ?? 0; if (max<=0) return map;
    list.forEach(entry => { const node = g.nodes.find(n=>n.id===entry.id); const base = (node?.size ?? 1.5); const scale = clamp(entry.value/max); map.set(entry.id, base + 1.2*scale); });
  } else if (mode==='mechanicUsage'){
    const max= mech[0]?.usage ?? 0; if (max<=0) return map;
    g.nodes.filter(n=>n.label==='Mechanic').forEach(n => { const name=n.properties?.['name'] as string|undefined; const rec = mech.find(m=>m.name===name); if(!name||!rec) return; const base=(n.size ?? 1.5); const sc=clamp(rec.usage/max); map.set(n.id, base + 1.5*sc); });
  }
  return map;
});

export const metricColors = derived([metricMode, characterRankings, mechanicUsageRanking, graphData], ([mode, ranks, mech, g]) => {
  const map = new Map<string, string>(); if (!g) return map;
  if (mode==='outDegree'){
    const max=ranks.outDegree[0]?.value ?? 0; ranks.outDegree.forEach(e=>{ if(e.value>0) map.set(e.id, interp('#bfdbfe','#1d4ed8', clamp(e.value/(max||1)))); });
  } else if (mode==='strongCount'){
    const max=ranks.strongCount[0]?.value ?? 0; ranks.strongCount.forEach(e=>{ if(e.value>0) map.set(e.id, interp('#fecaca','#b91c1c', clamp(e.value/(max||1)))); });
  } else if (mode==='mechanicUsage'){
    const max=mech[0]?.usage ?? 0; g.nodes.filter(n=>n.label==='Mechanic').forEach(n=>{ const name=n.properties?.['name'] as string|undefined; const rec=mech.find(m=>m.name===name); if(!name||!rec) return; map.set(n.id, interp('#bbf7d0','#047857', clamp(rec.usage/(max||1)))); });
  }
  return map;
});

// Helpers for components
export function toggleInSet(store: typeof activeLabels, value: string){
  store.update(s => { const n = new Set(s); n.has(value) ? n.delete(value) : n.add(value); return n; });
}

