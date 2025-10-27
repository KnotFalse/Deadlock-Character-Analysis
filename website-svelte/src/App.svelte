<script lang="ts">
  import './global.css';
  import { onMount } from 'svelte';
  import { initGraph, graphData, searchTerm, searchResults, selectedNodeId } from './stores/graph';
  import GraphView from './components/GraphView.svelte';
  import type { GraphData } from './types';

  let data: GraphData | null = null;
  onMount(async () => {
    const res = await fetch('graph.json', { cache: 'no-store' });
    const d = (await res.json()) as GraphData;
    initGraph(d);
    data = d;
    (window as any).__GRAPH_DATA__ = d;
  });
  $: gd = $graphData;
  $: results = $searchResults;
</script>

<div class="app">
  <h1>Deadlock Graph Explorer (Svelte)</h1>
  {#if !gd}
    <p>Loading graph data…</p>
  {:else}
    <p>Generated: {new Date(gd.meta.generated_at).toLocaleString()} • Nodes: {gd.meta.node_count} • Edges: {gd.meta.edge_count}</p>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:1rem">
      <aside style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem">
        <input placeholder="Search nodes..." type="search" bind:value={$searchTerm} style="width:100%;padding:0.45rem;border:1px solid #cbd5f5;border-radius:8px" />
        {#if $searchTerm}
          <ul style="margin-top:0.75rem;max-height:200px;overflow:auto">
            {#each results as node}
              <li><button on:click={() => selectedNodeId.set(node.id)} style="border:none;background:none;color:#2563eb;cursor:pointer">{(node.properties?.name as string) ?? node.id}</button></li>
            {/each}
          </ul>
        {/if}
      </aside>
      <section>
        <GraphView {data} />
      </section>
    </div>
  {/if}
</div>

