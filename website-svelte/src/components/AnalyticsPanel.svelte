<script lang="ts">
  import { metricMode, characterRankings, mechanicUsageRanking, selectedNodeId, mechanicFilter } from '../stores/graph';
  import { get } from 'svelte/store';
  const OPTIONS = [
    { value: 'default', label: 'Default', desc: 'Static layout sizes; label-based colors.' },
    { value: 'outDegree', label: 'Out-Degree', desc: 'Highlights nodes with many outgoing edges.' },
    { value: 'strongCount', label: 'Strong Matchups', desc: 'Emphasizes characters that counter many opponents.' },
    { value: 'mechanicUsage', label: 'Mechanic Usage', desc: 'Rescales mechanics by usage.' },
  ] as const;
  function setMode(v){ metricMode.set(v); }
</script>

<section class="analytics-panel">
  <div class="analytics-header">
    <h3>Analytics</h3>
    <div class="metric-toggle">
      {#each OPTIONS as o}
        <button class="toggle-button" class:active={$metricMode===o.value} on:click={() => setMode(o.value)} aria-pressed={$metricMode===o.value}>{o.label}</button>
      {/each}
    </div>
  </div>
  <p class="muted small">{OPTIONS.find(o=>o.value===$metricMode)?.desc}</p>
  <div class="analytics-grid">
    <div class="analytics-card">
      <h4>Top Out-Degree</h4>
      <ol>
        {#each $characterRankings.outDegree.slice(0,10) as r}
          <li>
            <div class="metric-row">
              <button class="link-button" on:click={() => selectedNodeId.set(r.id)}>{r.id}</button>
              <span class="metric-value">{r.value}</span>
            </div>
          </li>
        {/each}
      </ol>
    </div>
    <div class="analytics-card">
      <h4>Top Strong Matchups</h4>
      <ol>
        {#each $characterRankings.strongCount.slice(0,10) as r}
          <li>
            <div class="metric-row">
              <button class="link-button" on:click={() => selectedNodeId.set(r.id)}>{r.id}</button>
              <span class="metric-value">{r.value}</span>
            </div>
          </li>
        {/each}
      </ol>
    </div>
    <div class="analytics-card">
      <h4>Mechanic Usage</h4>
      <ol>
        {#each $mechanicUsageRanking.slice(0,10) as m}
          <li>
            <div class="metric-row">
              <button class="link-button" on:click={() => mechanicFilter.set(m.name)}>{m.name}</button>
              <span class="metric-value">{m.usage}</span>
            </div>
            <p class="metric-caption">Counters: {m.counter}</p>
          </li>
        {/each}
      </ol>
    </div>
  </div>
</section>

