<script lang="ts">
  import { graphData, selectedNodeId, pathStart, pathEnd, setPathStart, setPathEnd, clearPath, shortestPath } from '$lib/stores/graph';
  import type { GraphNode } from '$lib/types';
  import Combobox from '$lib/components/ui/Combobox.svelte';
  function nodeLabel(n: GraphNode): string { const name = (n.properties && (n.properties as any)['name']); return typeof name === 'string' ? name : n.id; }
  function items(){ if (!$graphData) return []; return $graphData.nodes.map((n:GraphNode)=>({ label: nodeLabel(n)+` (${n.label})`, value: n.id })); }
  function startLabel(){ if (!$graphData || !$pathStart) return ''; const n=$graphData.nodes.find(n=>n.id===$pathStart); return n? nodeLabel(n)+` (${n.label})`:''; }
  function endLabel(){ if (!$graphData || !$pathEnd) return ''; const n=$graphData.nodes.find(n=>n.id===$pathEnd); return n? nodeLabel(n)+` (${n.label})`:''; }
  function onStartSelect(v:string){ setPathStart(v||null); }
  function onEndSelect(v:string){ setPathEnd(v||null); }
</script>

{#if $graphData}
  <section class="path-tools" style="display:grid;gap:var(--gap-sm)">
    <h2>Path Tools</h2>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items:center">
      <Combobox placeholder="Start node" items={items()} value={startLabel()} onSelect={onStartSelect} testIdInput="path-start" listId="path-start-list" />
      <Combobox placeholder="End node" items={items()} value={endLabel()} onSelect={onEndSelect} testIdInput="path-end" listId="path-end-list" />
    </div>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="button" onclick={() => $selectedNodeId && setPathStart($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as start</button>
      <button class="button" onclick={() => $selectedNodeId && setPathEnd($selectedNodeId)} disabled={!$selectedNodeId}>Use selection as end</button>
      <button class="button" onclick={() => clearPath()}>Clear path</button>
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

