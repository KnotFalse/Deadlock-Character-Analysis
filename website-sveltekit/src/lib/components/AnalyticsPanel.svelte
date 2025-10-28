<script lang="ts">
  import { metricMode, characterRankings, mechanicUsageRanking, selectedNodeId, mechanicFilter, graphData } from '$lib/stores/graph';
  import { get } from 'svelte/store';
  type Mode = 'default'|'outDegree'|'strongCount'|'mechanicUsage';
  let currentMode = $state<Mode>(get(metricMode));
  let rankings = $state(get(characterRankings));
  let mechRanking = $state(get(mechanicUsageRanking));
  let gd = $state(get(graphData));
  metricMode.subscribe(v => currentMode = v as Mode);
  characterRankings.subscribe(v => rankings = v);
  mechanicUsageRanking.subscribe(v => mechRanking = v);
  graphData.subscribe(v => gd = v);
  function nameFor(id: string): string {
    if (!gd) return id;
    const n = gd.nodes.find((x:any)=>x.id===id);
    return (n?.properties?.['name'] as string) ?? id;
  }
  const OPTIONS = [
    { value: 'default', label: 'Default', desc: 'Static layout sizes; label-based colors.' },
    { value: 'outDegree', label: 'Out-Degree', desc: 'Highlights nodes with many outgoing edges.' },
    { value: 'strongCount', label: 'Strong Matchups', desc: 'Emphasizes characters that counter many opponents.' },
    { value: 'mechanicUsage', label: 'Mechanic Usage', desc: 'Rescales mechanics by usage.' },
  ] as const;
  function setMode(v: Mode){ metricMode.set(v); }
</script>

<section class="analytics-panel">
  <div class="analytics-header" data-testid="analytics-header">
    <h3>Analytics</h3>
    <div class="metric-toggle" data-testid="metric-toggle">
      {#each OPTIONS as o}
        <button class="toggle-button" data-testid={`metric-${o.value}`} class:active={currentMode===o.value} onclick={() => setMode(o.value)} aria-pressed={currentMode===o.value}>{o.label}</button>
      {/each}
    </div>
  </div>
  <p class="muted small">{OPTIONS.find(o=>o.value===currentMode)?.desc}</p>
  <div class="analytics-grid" data-testid="analytics-grid">
    <div class="analytics-card">
      <h4>Top Out-Degree</h4>
      <ol>
        {#each rankings.outDegree.slice(0,10) as r}
          <li>
            <div class="metric-row">
              <button class="link-button" onclick={() => selectedNodeId.set(r.id)}>{nameFor(r.id)}</button>
              <span class="metric-value">{r.value}</span>
            </div>
          </li>
        {/each}
      </ol>
    </div>
    <div class="analytics-card">
      <h4>Top Strong Matchups</h4>
      <ol>
        {#each rankings.strongCount.slice(0,10) as r}
          <li>
            <div class="metric-row">
              <button class="link-button" onclick={() => selectedNodeId.set(r.id)}>{nameFor(r.id)}</button>
              <span class="metric-value">{r.value}</span>
            </div>
          </li>
        {/each}
      </ol>
    </div>
    <div class="analytics-card">
      <h4>Mechanic Usage</h4>
      <ol>
        {#each mechRanking.slice(0,10) as m}
          <li>
            <div class="metric-row">
              <button class="link-button" onclick={() => mechanicFilter.set(m.name)}>{m.name}</button>
              <span class="metric-value">{m.usage}</span>
            </div>
            <p class="metric-caption">Counters: {m.counter}</p>
          </li>
        {/each}
      </ol>
    </div>
  </div>
</section>




