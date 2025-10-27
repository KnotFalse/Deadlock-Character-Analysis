<script lang="ts">
  import { activeLabels, activeArchetypes, relationshipFilters, mechanicFilter, searchTerm, labelOptions, archetypeOptions, mechanicOptions, toggleInSet, searchResults, selectedNodeId, neighborMode } from '$lib/stores/graph';
  const REL_OPTIONS = ['STRONG_AGAINST','WEAK_AGAINST','EVEN_AGAINST'];
  function onMechanicChange(e: Event){
    const value = (e.target as HTMLSelectElement).value;
    mechanicFilter.set(value || null);
  }
  let searchTimer: any = null;
  function onSearchInput(e: Event){
    const value = (e.target as HTMLInputElement).value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(()=> searchTerm.set(value), 200);
  }
</script>

<aside style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;display:grid;gap:1rem">
  <section>
    <h2>Search</h2>
    <input data-testid="search" placeholder="Search nodes..." type="search" value={$searchTerm} on:input={onSearchInput} style="width:100%;padding:0.45rem;border:1px solid #cbd5f5;border-radius:8px" />
    {#if $searchTerm && $searchResults && $searchResults.length > 0}
      <ul style="margin-top:0.5rem;list-style:none;padding:0;display:grid;gap:0.25rem">
        {#each $searchResults.slice(0, 10) as n}
          <li>
            <button class="link-button" on:click={() => selectedNodeId.set(n.id)} aria-label={(n.properties?.['name'] ?? n.id)}>
              {n.properties?.['name'] ?? n.id}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2>Neighbor Mode</h2>
    <label><input data-testid="neighbor-toggle" type="checkbox" checked={$neighborMode} on:change={() => neighborMode.set(!$neighborMode)} /> Highlight neighbors of selection</label>
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
    <select value={$mechanicFilter || ''} on:change={onMechanicChange}>
      <option value="">All mechanics</option>
      {#each $mechanicOptions as m}
        <option value={m}>{m}</option>
      {/each}
    </select>
  </section>
</aside>



