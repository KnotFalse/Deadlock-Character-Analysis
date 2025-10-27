<script lang="ts">
  import { graphData, selectedNodeId, pathStart, pathEnd, setPathStart, setPathEnd, clearPath, shortestPath } from '../stores/graph';
  import type { GraphNode } from '../types';
  function grouped(gd){
    const groups: Record<string, GraphNode[]> = {};
    gd.nodes.forEach((n:GraphNode)=>{ (groups[n.label]??=[]).push(n); });
    Object.keys(groups).forEach(k=>groups[k].sort((a,b)=>((a.properties?.['name'] as string) ?? a.id).localeCompare((b.properties?.['name'] as string) ?? b.id)));
    return groups;
  }
</script>

{#if $graphData}
  <section style="display:grid;gap:0.5rem">
    <h2>Path Tools</h2>
    <label class="muted" for="start">Start node</label>
    <select id="start" bind:value={$pathStart} on:change={(e)=>setPathStart((e.target as HTMLSelectElement).value||null)}>
      <option value="">Select start…</option>
      {#each Object.entries(grouped($graphData)) as [label, nodes]}
        <optgroup label={label}>
          {#each nodes as n}
            <option value={n.id}>{(n.properties?.['name'] as string) ?? n.id} ({label})</option>
          {/each}
        </optgroup>
      {/each}
    </select>
    <label class="muted" for="end">End node</label>
    <select id="end" bind:value={$pathEnd} on:change={(e)=>setPathEnd((e.target as HTMLSelectElement).value||null)}>
      <option value="">Select end…</option>
      {#each Object.entries(grouped($graphData)) as [label, nodes]}
        <optgroup label={label}>
          {#each nodes as n}
            <option value={n.id}>{(n.properties?.['name'] as string) ?? n.id} ({label})</option>
          {/each}
        </optgroup>
      {/each}
    </select>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <button on:click={() => $selectedNodeId && setPathStart($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as start</button>
      <button on:click={() => $selectedNodeId && setPathEnd($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as end</button>
      <button on:click={() => clearPath()}>Clear path</button>
    </div>
    {#if $pathStart && $pathEnd && $shortestPath.length===0}
      <p class="muted">No connection found between the chosen nodes.</p>
    {/if}
  </section>
{/if}

