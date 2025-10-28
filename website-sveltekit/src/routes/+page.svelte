<script lang="ts">
  import GraphView from '$lib/components/GraphView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import PathTools from '$lib/components/PathTools.svelte';
  import RelationshipPanel from '$lib/components/RelationshipPanel.svelte';
  import AnalyticsPanel from '$lib/components/AnalyticsPanel.svelte';
  import { initGraph, graphData } from '$lib/stores/graph';
  import type { GraphData } from '$lib/types';
  const props = $props<{ data: { graph: GraphData } }>();
  let data: GraphData | null = null;
  $effect(() => {
    const g = props.data?.graph as GraphData | undefined;
    if (g) {
      data = g;
      initGraph(g);
      if (typeof window !== 'undefined') (window as any).__GRAPH_DATA__ = g;
    }
  });
</script>

<div id="app" class="app">
  <h1>Deadlock Graph Explorer (SvelteKit)</h1>
  {#if !$graphData}
    <p>Loading graph data…</p>
  {:else}
    <p class="muted small">Generated: {new Date($graphData.meta.generated_at).toLocaleString()} • Nodes: {$graphData.meta.node_count} • Edges: {$graphData.meta.edge_count}</p>
    <div class="grid-2">
      <Sidebar />
      <section>
        <div class="card graph-card"><GraphView {data} /></div>
        <div class="card" style="margin-top:var(--gap-md); display:grid; gap:var(--gap-md)">
          <PathTools />
          <details>
            <summary class="link-button" style="list-style:none;cursor:pointer">Relationship Panel</summary>
            <div style="margin-top:0.5rem"><RelationshipPanel /></div>
          </details>
          <AnalyticsPanel />
        </div>
      </section>
    </div>
  {/if}
</div>
