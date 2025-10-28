<script lang="ts">
  import { onMount } from 'svelte';
  import GraphView from '$lib/components/GraphView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import PathTools from '$lib/components/PathTools.svelte';
  import RelationshipPanel from '$lib/components/RelationshipPanel.svelte';
  import AnalyticsPanel from '$lib/components/AnalyticsPanel.svelte';
  import { initGraph, graphData } from '$lib/stores/graph';
  import type { GraphData } from '$lib/types';

  let data: GraphData | null = null;
  onMount(async () => {
    const res = await fetch('graph.json', { cache: 'no-store' });
    const d = (await res.json()) as GraphData;
    initGraph(d);
    data = d;
    (window as any).__GRAPH_DATA__ = d;
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
        <div class="card" style="margin-top:var(--gap-md)">
          <PathTools />
          <RelationshipPanel />
          <AnalyticsPanel />
        </div>
      </section>
    </div>
  {/if}
</div>
