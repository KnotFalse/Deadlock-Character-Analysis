<script lang="ts">
  import { graphData, selectedNodeId, selectedEdgeId } from '$lib/stores/graph';
  import type { GraphEdge } from '$lib/types';
  const REL = ['STRONG_AGAINST','WEAK_AGAINST','EVEN_AGAINST'];
  function group(gd, sel){
    const out: Record<string, GraphEdge[]> = { STRONG_AGAINST:[], WEAK_AGAINST:[], EVEN_AGAINST:[] } as any;
    if (!gd || !sel) return out;
    gd.edges.forEach((e)=>{
      if (!REL.includes(e.type)) return;
      if (e.source===sel || e.target===sel) out[e.type].push(e);
    });
    Object.keys(out).forEach(t => out[t].sort((a,b)=>{
      const oa = a.source===sel ? a.target : a.source; const ob = b.source===sel ? b.target : b.source;
      const la = label(gd, oa); const lb = label(gd, ob); return la.localeCompare(lb);
    }));
    return out;
  }
  function label(gd, id){ const n = gd.nodes.find((x)=>x.id===id); return (n?.properties?.['name'] as string) ?? id; }
  function reason(e: GraphEdge){
    const rs = (e.properties?.['reasons'] as string[]|undefined) || [];
    if (rs.length) return rs.join(' • ');
    return (e.properties?.['reason'] as string) ?? '';
  }
  function evidence(e: GraphEdge){
    const c = e.properties?.['evidence_count'];
    if (typeof c === 'number') return c;
    const v = e.properties?.['evidence'];
    return typeof v==='number' ? v : Number(v ?? 0);
  }
</script>

{#if $graphData}
  {#if $selectedNodeId}
    <section class="relationship-summary" aria-label="Matchup Relationships">
      <h3>Matchup Relationships</h3>
      {#each REL as type}
        {#if group($graphData,$selectedNodeId)[type].length}
          <div class="relationship-group" data-testid={`rel-group-${type.toLowerCase()}`} role="list" aria-label={type.replace('_',' ')}>
            <p class="muted">{type.replace('_',' ')}</p>
            <ul>
              {#each group($graphData,$selectedNodeId)[type] as e}
                {#key e.id}
                <li role="listitem">
                  <button class="link-button relationship" class:active={$selectedEdgeId===e.id} on:click={() => selectedEdgeId.set(e.id)}>
                    {(e.source===$selectedNodeId? '→ ' : '← ') + label($graphData, e.source=== $selectedNodeId ? e.target : e.source)}
                    {#if evidence(e) !== 0}<span class="muted"> • {evidence(e)}</span>{/if}
                  </button>
                </li>
                {/key}
              {/each}
            </ul>
          </div>
        {/if}
      {/each}
      {#if $selectedEdgeId}
        {#each $graphData.edges.filter(e=>e.id===$selectedEdgeId) as e}
          <div class="edge-summary">
            <div class="edge-summary__header"><h3>Relationship Detail</h3><button on:click={() => selectedEdgeId.set(null)}>Clear</button></div>
            <p class="muted">{e.type.replace('_',' ')} • {label($graphData,e.source)} → {label($graphData,e.target)}</p>
            {#if reason(e)}<p>{reason(e)}</p>{:else}<p class="muted">No narrative reason provided.</p>{/if}
            <dl class="edge-meta">
              <dt>Source</dt><dd>{label($graphData,e.source)}</dd>
              <dt>Target</dt><dd>{label($graphData,e.target)}</dd>
              {#if evidence(e) !== 0}<dt>Evidence Count</dt><dd>{evidence(e)}</dd>{/if}
            </dl>
          </div>
        {/each}
      {/if}
    </section>
  {:else}
    <p class="muted">Click a node to view relationships.</p>
  {/if}
{/if}







