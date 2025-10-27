<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Sigma from 'sigma';
  import Graph from 'graphology';
  import type { GraphData } from '$lib/types';
  import { selectedNodeId, selectedEdgeId, neighborIds, neighborEdgeIds, shortestPath, pathEdgeIds, metricSizes, metricColors, searchResults } from '$lib/stores/graph';
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

  let rafScheduled = false;
  function applyHighlightsNow(){
    if (!sigma || !data) return;
    if (typeof window !== 'undefined' && (window as any).__PERF_LOG__) {
      const marks = (window as any).__PERF_PENDING_MARK__ as string | undefined;
      if (marks) {
        try {
          performance.measure(marks.replace('-start',''), marks);
        } catch {}
        (window as any).__PERF_PENDING_MARK__ = undefined;
      }
      // also handle simple one-shot marks like 'neighbor-toggle' or 'search-input'
      const simple = (window as any).__PERF_SIMPLE_MARK__ as string | undefined;
      if (simple) {
        try { performance.measure(simple, simple); } catch {}
        (window as any).__PERF_SIMPLE_MARK__ = undefined;
      }
    }
    const g = sigma.getGraph();
    g.forEachNode((n)=>{
      const base = g.getNodeAttribute(n,'color') as string;
      let color = _metricColors.get(n) ?? base;
      let size = _metricSizes.get(n) ?? (g.getNodeAttribute(n,'size') as number);
      if (_searchIds.size>0) color = _searchIds.has(n) ? '#60a5fa' : '#cbd5f5';
      if (_neighborIds.has(n)) { color = '#34d399'; size = size + 0.9; }
      if (_path.has(n)) { color = '#facc15'; size = size + 1.1; }
      if (_selNode && n===_selNode) { color = '#f97316'; size = size + 1.3; }
      g.setNodeAttribute(n,'color',color); g.setNodeAttribute(n,'size',size);
    });
    g.forEachEdge((e)=>{
      const base = g.getEdgeAttribute(e,'color') as string; let color = base; let size = (g.getEdgeAttribute(e,'size') as number) ?? 1;
      if (_neighborEdgeIds.has(e)) { color='#34d399'; size = Math.max(size, 1.75); }
      if (_pathEdges.has(e)) { color='#facc15'; size = Math.max(size, 2); }
      if (_selEdge && e===_selEdge) { color='#f97316'; size = Math.max(size, 2.25); }
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
        color: '#334155',
        raw: n,
      });
    });
    data.edges.forEach((e) => {
      if (g.hasNode(e.source) && g.hasNode(e.target))
        g.addEdgeWithKey(e.id, e.source, e.target, {
          label: e.type,
          color: '#94a3b8',
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
    ];
    // Initial paint after mount
    tick().then(scheduleApply);
    // Clean up subscriptions on destroy
    onDestroy(()=>{ unsubs.forEach(u=>u()); });
  });
  onDestroy(() => { sigma?.kill(); sigma = null; });
</script>

{#if lightMode}
  <div data-testid="graph-light-mode" style="width:100%;height:600px;border-radius:12px;border:1px solid #e2e8f0;display:grid;place-items:center;background:#f8fafc;color:#64748b;text-align:center">
    <div>
      <p>Graph rendering disabled for CI run.</p>
      <p class="muted small">Interactive canvas loads in standard builds.</p>
    </div>
  </div>
{:else}
  <div bind:this={container} style="width:100%;height:600px;border-radius:12px;border:1px solid #e2e8f0"></div>
{/if}

