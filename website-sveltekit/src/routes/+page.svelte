<script lang="ts">
  import GraphView from '$lib/components/GraphView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import PathTools from '$lib/components/PathTools.svelte';
  import RelationshipPanel from '$lib/components/RelationshipPanel.svelte';
  import AnalyticsPanel from '$lib/components/AnalyticsPanel.svelte';
  import { initGraph, graphData, appReady } from '$lib/stores/graph';
  import type { GraphData } from '$lib/types';
  const props = $props<{ data: { graph: GraphData|null; loadError?: string } }>();
  let relOpen = $state(true);
  function openRel(){ relOpen = true; }
  $effect(() => {
    const g = (props.data?.graph ?? null) as GraphData | null;
    if (g) {
      initGraph(g);
      if (typeof window !== 'undefined') (window as any).__GRAPH_DATA__ = g;
      if (typeof window !== 'undefined') console.info('[app] graph ready');
    }
  });
  $effect(() => { 
    if ($appReady && typeof window !== 'undefined') {
      (window as any).__GRAPH_READY__ = true;
      (window as any).GRAPH_READY = true; // alias for docs/checklists
    }
  });
  $effect(() => { const e = (props.data as any)?.loadError; if (e && typeof window !== 'undefined') (window as any).__GRAPH_LOAD_ERROR__ = e; });
</script>

<div id="app" class="app">
  <h1>Deadlock Graph Explorer (SvelteKit)</h1>
    <div class="grid-2">
    <Sidebar />
    <section>
      {#if $appReady}
        {#if $graphData}
          <p class="muted small">Generated: {new Date($graphData.meta.generated_at).toLocaleString()} · Nodes: {$graphData.meta.node_count} · Edges: {$graphData.meta.edge_count}</p>
        {/if}
        <div class="card graph-card"><GraphView data={props.data?.graph ?? null} /></div>
        <div class="card" style="margin-top:var(--gap-md); display:grid; gap:var(--gap-md)">
          <PathTools />
          <button class="link-button" aria-controls="relationship-panel" aria-expanded={relOpen ? 'true':'false'} onclick={openRel}>Relationship Panel</button>
          <div id="relationship-panel" style="margin-top:0.5rem" hidden={!relOpen}>
            <RelationshipPanel />
          </div>
          <AnalyticsPanel />
        </div>
      {:else}
        <p>Loading graph data.</p>
      {/if}
    </section>
  </div>{#if (props.data as any)?.loadError}
    <p class="muted small" data-testid="load-error">Load error: {(props.data as any).loadError}</p>
  {/if}
  {#if $appReady}
    <div data-testid="app-ready"></div>
  {/if}
</div>


