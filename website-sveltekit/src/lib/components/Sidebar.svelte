<script lang="ts">
  import { activeLabels, activeArchetypes, relationshipFilters, mechanicFilter, searchTerm, labelOptions, archetypeOptions, mechanicOptions, toggleInSet, searchResults, selectedNodeId, neighborMode } from '$lib/stores/graph';
  const REL_OPTIONS = ['STRONG_AGAINST','WEAK_AGAINST','EVEN_AGAINST'];
  function onMechanicChange(e: Event){
    const value = (e.target as HTMLSelectElement).value;
    mechanicFilter.set(value || null);
  }
  let searchTimer: any = null;
  let focusedIndex = -1;
  function onSearchInput(e: Event){
    const value = (e.target as HTMLInputElement).value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(()=> { 
      if (typeof window !== 'undefined' && (window as any).__PERF_LOG__) { performance.mark('search-input'); (window as any).__PERF_SIMPLE_MARK__ = 'search-input'; }
      focusedIndex = -1; 
      searchTerm.set(value);
    }, 200);
  }
  function labelColor(label: string): string {
    const key = label.toLowerCase();
    if (key==='character') return 'var(--label-character)';
    if (key==='ability') return 'var(--label-ability)';
    if (key==='mechanic') return 'var(--label-mechanic)';
    if (key==='archetype') return 'var(--label-archetype)';
    return 'var(--primary)';
  }
</script>

<aside class="card" style="display:grid;gap:var(--gap-md)">
  <section>
    <h2>Search</h2>
    <input class="input" data-testid="search" aria-controls="search-results" placeholder="Search nodes..." type="search" value={$searchTerm} on:input={onSearchInput} on:keydown={(e)=>{
      const list = document.getElementById('search-results');
      const items = list ? Array.from(list.querySelectorAll('li button')) : [];
      const idx = (window as any).__SEARCH_IDX__ ?? -1;
      if (e.key==='ArrowDown') { (window as any).__SEARCH_IDX__ = Math.min(idx+1, items.length-1); e.preventDefault(); items[(window as any).__SEARCH_IDX__]?.focus(); }
      else if (e.key==='ArrowUp') { (window as any).__SEARCH_IDX__ = Math.max(idx-1, 0); e.preventDefault(); items[(window as any).__SEARCH_IDX__]?.focus(); }
      else if (e.key==='Enter') { if ((window as any).__SEARCH_IDX__ >= 0) { items[(window as any).__SEARCH_IDX__]?.click(); e.preventDefault(); } }
      else if (e.key==='Escape') { (window as any).__SEARCH_IDX__ = -1; searchTerm.set(''); }
    }} />
    {#if $searchTerm && $searchResults && $searchResults.length > 0}
      <ul role="listbox" id="search-results" data-testid="search-results" style="margin-top:0.5rem;list-style:none;padding:0;display:grid;gap:0.25rem">
        {#each $searchResults.slice(0, 10) as n, i}
          <li role="option" aria-selected={i===focusedIndex}>
            <button class="link-button" on:click={() => selectedNodeId.set(n.id)} aria-label={(n.properties?.['name'] ?? n.id)} on:focus={() => focusedIndex = i}>
              {n.properties?.['name'] ?? n.id}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2>Neighbor Mode</h2>
    <label class="checkbox-row"><input data-testid="neighbor-toggle" type="checkbox" checked={$neighborMode} on:change={() => { if (typeof window!=='undefined' && (window as any).__PERF_LOG__) { performance.mark('neighbor-toggle'); (window as any).__PERF_SIMPLE_MARK__='neighbor-toggle'; } neighborMode.set(!$neighborMode); }} /> Highlight neighbors of selection</label>
  </section>

  <section>
    <h2>Node Labels</h2>
    <ul class="legend">
      {#each $labelOptions as label}
        <li><label><input type="checkbox" checked={$activeLabels.has(label)} on:change={() => toggleInSet(activeLabels, label)} /> <span class="legend-dot" style={`background:${labelColor(label)}`}></span>{label}</label></li>
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
    <select class="select" value={$mechanicFilter || ''} on:change={onMechanicChange}>
      <option value="">All mechanics</option>
      {#each $mechanicOptions as m}
        <option value={m}>{m}</option>
      {/each}
    </select>
  </section>
</aside>



