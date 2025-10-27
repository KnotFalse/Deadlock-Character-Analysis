<script lang="ts">
  import './global.css';
  import { onMount } from 'svelte';
  import { initGraph, graphData, searchTerm, searchResults, selectedNodeId } from './stores/graph';
  import GraphView from './components/GraphView.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import PathTools from './components/PathTools.svelte';
  import RelationshipPanel from './components/RelationshipPanel.svelte';
  import AnalyticsPanel from './components/AnalyticsPanel.svelte';
  import type { GraphData } from './types';

  let data: GraphData | null = null;
  onMount(async () => {
    const res = await fetch('graph.json', { cache: 'no-store' });
    const d = (await res.json()) as GraphData;
    initGraph(d);
    data = d;
    (window as any).__GRAPH_DATA__ = d;
  });
  // Avoid reactive assignments that produce orphan effects in Svelte 5
</script>

<div class="app">
  <h1>Deadlock Graph Explorer (Svelte)</h1>
  {#if !$graphData}
    <p>Loading graph data…</p>
  {:else}
    <p>Generated: {new Date($graphData.meta.generated_at).toLocaleString()} • Nodes: {$graphData.meta.node_count} • Edges: {$graphData.meta.edge_count}</p>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:1rem">
      <Sidebar />
      <section>
        <GraphView {data} />
        <div class="details" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-top:1rem">
          <PathTools />
          <RelationshipPanel />
          <AnalyticsPanel />
        </div>
      </section>
    </div>
  {/if}
</div>
