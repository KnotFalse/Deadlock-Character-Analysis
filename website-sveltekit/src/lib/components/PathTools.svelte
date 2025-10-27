<script lang="ts">
  import { graphData, selectedNodeId, pathStart, pathEnd, setPathStart, setPathEnd, clearPath, shortestPath } from '$lib/stores/graph';
  import type { GraphNode } from '$lib/types';
  function grouped(gd){
    const groups: Record<string, GraphNode[]> = {};
    gd.nodes.forEach((n:GraphNode)=>{ (groups[n.label]??=[]).push(n); });
    Object.keys(groups).forEach(k=>groups[k].sort((a,b)=> (nodeLabel(a)).localeCompare(nodeLabel(b)) ));
    return groups;
  }
  function nodeLabel(n: GraphNode): string { const name = (n.properties && (n.properties as any)['name']); return typeof name === 'string' ? name : n.id; }
  function onStartChange(e: Event){ const v = (e.target as HTMLSelectElement).value; setPathStart(v || null); }
  function onEndChange(e: Event){ const v = (e.target as HTMLSelectElement).value; setPathEnd(v || null); }
</script>

{#if $graphData}
  <section style="display:grid;gap:var(--gap-sm)">
    <h2>Path Tools</h2>
    <label class="muted" for="start">Start node</label>
    <select class="select" id="start" data-testid="path-start" value={$pathStart || ''} on:change={onStartChange}>
      <option value="">Select start…</option>
      {#each Object.entries(grouped($graphData)) as [label, nodes]}
        <optgroup label={label}>
          {#each nodes as n}
            <option value={n.id}>{nodeLabel(n)} ({label})</option>
          {/each}
        </optgroup>
      {/each}
    </select>
    <label class="muted" for="end">End node</label>
    <select class="select" id="end" data-testid="path-end" value={$pathEnd || ''} on:change={onEndChange}>
      <option value="">Select end…</option>
      {#each Object.entries(grouped($graphData)) as [label, nodes]}
        <optgroup label={label}>
          {#each nodes as n}
            <option value={n.id}>{nodeLabel(n)} ({label})</option>
          {/each}
        </optgroup>
      {/each}
    </select>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="button" on:click={() => $selectedNodeId && setPathStart($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as start</button>
      <button class="button" on:click={() => $selectedNodeId && setPathEnd($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as end</button>
      <button class="button" on:click={() => clearPath()}>Clear path</button>
    </div>
    {#if $shortestPath.length > 0}
      <section class="path-summary" style="margin-top:0.5rem">
        <h3>Shortest Path</h3>
        <ul class="path-list" style="list-style:none;padding:0;display:flex;gap:0.25rem;flex-wrap:wrap">
          {#each $shortestPath as id, i}
            <li>
              {#if $graphData}
                <span>{$graphData.nodes.find(n=>n.id===id)?.properties?.['name'] ?? id}</span>{#if i < $shortestPath.length - 1}<span class="muted"> → </span>{/if}
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if $pathStart && $pathEnd && $shortestPath.length===0}
      <p class="muted" data-testid="no-path">No connection found between the chosen nodes.</p>
    {/if}
  </section>
{/if}




