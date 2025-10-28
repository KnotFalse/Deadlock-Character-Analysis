<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Sigma from 'sigma';
  import Graph from 'graphology';
  import type { GraphData } from '$lib/types';
  import { selectedNodeId, selectedEdgeId, neighborIds, neighborEdgeIds, shortestPath, pathEdgeIds, metricSizes, metricColors, searchResults, visibleNodeIds, filteredEdges } from '$lib/stores/graph';
  import { tick } from 'svelte';
  export let data: GraphData | null = null;
  let container: HTMLDivElement;
  let sigma: Sigma | null = null;

  let lightMode = false;

  // Local mirrors of store values for highlighting
  let _neighborIds = new Set<string>();
  let _neighborEdgeIds = new Set<string>();
  let _path = new Set<string>();
  let _pathEdges = new Set<string>();
  let _metricSizes = new Map<string, number>();
  let _metricColors = new Map<string, string>();
  let _searchIds = new Set<string>();
  let _selNode: string | null = null;
  let _selEdge: string | null = null;
  let _visibleNodes = new Set<string>();
  let _visibleEdgeIds = new Set<string>();

  let rafScheduled = false;
  function applyHighlightsNow(){
    if (!sigma || !data) return;
    if (typeof window !== 'undefined' && (window as any).__PERF_LOG__) {
      const simple = (window as any).__PERF_SIMPLE_MARK__ as string | undefined;
      if (simple) {
        try {
          // measure duration since mark and log
          performance.measure(simple, simple);
          const entries = performance.getEntriesByName(simple);
          const last = entries[entries.length - 1];
          if (last) console.log(`[perf] ${simple}: ${last.duration.toFixed(1)}ms`);
        } catch {}
        (window as any).__PERF_SIMPLE_MARK__ = undefined;
      }
    }
    const g = sigma.getGraph();
    // 1) Apply visibility from filters
    if (_visibleNodes.size > 0) {
      g.forEachNode((n) => {
        const show = _visibleNodes.has(n);
        g.setNodeAttribute(n, 'hidden', !show);
      });
    }
    if (_visibleEdgeIds.size > 0) {
      g.forEachEdge((e) => {
        const show = _visibleEdgeIds.has(e);
        g.setEdgeAttribute(e, 'hidden', !show);
      });
    }
    // Read CSS vars once per run to avoid repeated style recalcs
    const docStyles = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : ({} as any);
    const colSearch = (docStyles.getPropertyValue?.('--graph-search')?.trim?.() || '#60a5fa');
    const colDeemph = (docStyles.getPropertyValue?.('--graph-deemph')?.trim?.() || '#cbd5f5');
    const colNeighbor = (docStyles.getPropertyValue?.('--graph-neighbor')?.trim?.() || '#34d399');
    const colPath = (docStyles.getPropertyValue?.('--graph-path')?.trim?.() || '#facc15');
    const colSelected = (docStyles.getPropertyValue?.('--graph-selected')?.trim?.() || '#f97316');
    // 2) Apply color/size styling (always compute from baseSize)
    g.forEachNode((n)=>{
      const baseColor = g.getNodeAttribute(n,'color') as string;
      let color = _metricColors.get(n) ?? baseColor;
      const baseSize = (g.getNodeAttribute(n,'baseSize') as number) ?? (g.getNodeAttribute(n,'size') as number);
      let size = _metricSizes.get(n) ?? baseSize;
      if (_searchIds.size>0) color = _searchIds.has(n) ? colSearch : colDeemph;
      if (_neighborIds.has(n)) { color = colNeighbor; size = size + 0.9; }
      if (_path.has(n)) { color = colPath; size = size + 1.1; }
      if (_selNode && n===_selNode) { color = colSelected; size = size + 1.3; }
      g.setNodeAttribute(n,'color',color); g.setNodeAttribute(n,'size',size);
    });
    g.forEachEdge((e)=>{
      const base = g.getEdgeAttribute(e,'color') as string; let color = base; let size = (g.getEdgeAttribute(e,'size') as number) ?? 1;
      if (_neighborEdgeIds.has(e)) { color = colNeighbor; size = Math.max(size, 1.75); }
      if (_pathEdges.has(e)) { color = colPath; size = Math.max(size, 2); }
      if (_selEdge && e===_selEdge) { color = colSelected; size = Math.max(size, 2.25); }
      g.setEdgeAttribute(e,'color',color); g.setEdgeAttribute(e,'size',size);
    });
  }
  function scheduleApply(){
    if (rafScheduled) return; rafScheduled = true;
    requestAnimationFrame(()=>{ rafScheduled = false; applyHighlightsNow(); });
  }

  onMount(() => {
    lightMode = typeof window !== 'undefined' && Boolean((window as any).__GRAPH_LIGHT_MODE__);
    if (lightMode) return;
    if (!data) return;
    const g = new Graph({ type: 'undirected', allowSelfLoops: true });
    data.nodes.forEach((n) => {
      g.addNode(n.id, {
        label: (n.properties?.name as string) ?? n.id,
        x: n.x ?? Math.random() * 10,
        y: n.y ?? Math.random() * 10,
        size: n.size,
        baseSize: n.size,
        color: getComputedStyle(document.documentElement).getPropertyValue('--graph-node').trim() || '#334155',
        raw: n,
      });
    });
    // Guard against duplicate edges in data (by id and by node pair)
    const seenPairs = new Set<string>();
    data.edges.forEach((e) => {
      const { source, target } = e;
      if (!g.hasNode(source) || !g.hasNode(target)) return;
      // Pair-level dedupe for simple graphs (normalize order for undirected drawing)
      const pairKey = source < target ? `${source}|${target}` : `${target}|${source}`;
      if (seenPairs.has(pairKey)) return;
      seenPairs.add(pairKey);
      // Key-level dedupe safety
      if (g.hasEdge(e.id)) return;
      g.addEdgeWithKey(e.id, source, target, {
        label: e.type,
        color: getComputedStyle(document.documentElement).getPropertyValue('--graph-edge').trim() || '#94a3b8',
        raw: e,
      });
    });
    sigma = new Sigma(g, container, { renderLabels: true });
    sigma.on('clickNode', (e) => { selectedNodeId.set(e.node as string); selectedEdgeId.set(null); });
    sigma.on('clickEdge', (e) => { selectedEdgeId.set(e.edge as string); });
    // Clear selection when clicking the empty stage
    // @ts-ignore - types for getMouseCaptor may vary
    sigma.getMouseCaptor().on('clickStage', () => { selectedNodeId.set(null); selectedEdgeId.set(null); });

    // Subscribe to store changes and re-apply highlights
    const unsubs = [
      neighborIds.subscribe(v=>{ _neighborIds = new Set(v); scheduleApply(); }),
      neighborEdgeIds.subscribe(v=>{ _neighborEdgeIds = new Set(v); scheduleApply(); }),
      shortestPath.subscribe(v=>{ _path = new Set(v); scheduleApply(); }),
      pathEdgeIds.subscribe(v=>{ _pathEdges = new Set(v); scheduleApply(); }),
      metricSizes.subscribe(v=>{ _metricSizes = new Map(v); scheduleApply(); }),
      metricColors.subscribe(v=>{ _metricColors = new Map(v); scheduleApply(); }),
      searchResults.subscribe(v=>{ _searchIds = new Set((v||[]).map((n:any)=>n.id)); scheduleApply(); }),
      selectedNodeId.subscribe(v=>{ _selNode = v; scheduleApply(); }),
      selectedEdgeId.subscribe(v=>{ _selEdge = v; scheduleApply(); }),
      visibleNodeIds.subscribe(v=>{ _visibleNodes = new Set(v as any); scheduleApply(); }),
      filteredEdges.subscribe(v=>{ _visibleEdgeIds = new Set((v as any[]).map((e:any)=>e.id)); scheduleApply(); }),
    ];
    // Initial paint after mount
    tick().then(scheduleApply);
    // Clean up subscriptions on destroy
    onDestroy(()=>{ unsubs.forEach(u=>u()); });
  });
  onDestroy(() => { sigma?.kill(); sigma = null; });
</script>

{#if lightMode}
  <div data-testid="graph-light-mode" style="width:100%;height:100%;display:grid;place-items:center;background:var(--graph-bg);color:var(--muted);text-align:center;border-radius:var(--radius)">
    <div>
      <p>Graph rendering disabled for CI run.</p>
      <p class="muted small">Interactive canvas loads in standard builds.</p>
    </div>
  </div>
{:else}
  <div bind:this={container} style="width:100%;height:100%;border-radius:var(--radius)"></div>
{/if}

