<script lang="ts">
  import { activeLabels, activeArchetypes, relationshipFilters, mechanicFilter, searchTerm, labelOptions, archetypeOptions, mechanicOptions, toggleInSet } from '../stores/graph';
  const REL_OPTIONS = ['STRONG_AGAINST','WEAK_AGAINST','EVEN_AGAINST'];
</script>

<aside style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;display:grid;gap:1rem">
  <section>
    <h2>Search</h2>
    <input data-testid="search" placeholder="Search nodes..." type="search" bind:value={$searchTerm} style="width:100%;padding:0.45rem;border:1px solid #cbd5f5;border-radius:8px" />
  </section>

  <section>
    <h2>Node Labels</h2>
    <ul>
      {#each $labelOptions as label}
        <li><label><input type="checkbox" checked={$activeLabels.has(label)} on:change={() => toggleInSet(activeLabels, label)} /> {label}</label></li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>Archetypes</h2>
    <ul>
      {#each $archetypeOptions as a}
        <li><label><input type="checkbox" checked={$activeArchetypes.has(a)} on:change={() => toggleInSet(activeArchetypes, a)} /> {a}</label></li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>Relationships</h2>
    <ul>
      {#each REL_OPTIONS as r}
        <li><label><input type="checkbox" checked={$relationshipFilters.has(r)} on:change={() => toggleInSet(relationshipFilters, r)} /> {r.replace('_',' ')}</label></li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>Mechanic Filter</h2>
    <select bind:value={$mechanicFilter} on:change={(e)=>mechanicFilter.set((e.target as HTMLSelectElement).value||null)}>
      <option value="">All mechanics</option>
      {#each $mechanicOptions as m}
        <option value={m}>{m}</option>
      {/each}
    </select>
  </section>
</aside>

