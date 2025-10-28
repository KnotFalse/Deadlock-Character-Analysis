<script lang="ts">
  import { activeLabels, activeArchetypes, relationshipFilters, mechanicFilter, searchTerm, labelOptions, archetypeOptions, mechanicOptions, toggleInSet, searchResults, selectedNodeId, neighborMode } from '$lib/stores/graph';
  import Combobox from '$lib/components/ui/Combobox.svelte';
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
  // Build items for comboboxes
  function searchItems(){
    const arr = ($searchResults || []).slice(0, 10);
    return arr.map((n:any) => ({ label: (n.properties?.['name'] ?? n.id) as string, value: n.id }));
  }
  function onSearchSelect(val: string){
    if (val) selectedNodeId.set(val);
    searchTerm.set('');
  }
  let searchDebounce: any = null;
  function onSearchQuery(q: string){
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(()=>{ searchTerm.set(q); }, 200);
  }
  function mechanicItems(){
    return ($mechanicOptions || []).map((m:string) => ({ label: m, value: m }));
  }
  function onMechanicSelect(val: string){ mechanicFilter.set(val || null); }
</script>

<aside class="card sidebar">
  <section class="section">
    <h2>Search</h2>
    <Combobox placeholder="Search nodes..." items={searchItems()} onSelect={onSearchSelect} onQuery={onSearchQuery} testIdInput="search" testIdList="search-results" listId="search-results" />
  </section>

  <section class="section">
    <h2>Neighbor Mode</h2>
    <label class="checkbox-row"><input data-testid="neighbor-toggle" type="checkbox" checked={$neighborMode} onchange={() => { if (typeof window!=='undefined' && (window as any).__PERF_LOG__) { performance.mark('neighbor-toggle'); (window as any).__PERF_SIMPLE_MARK__='neighbor-toggle'; } neighborMode.set(!$neighborMode); }} /> Highlight neighbors of selection</label>
  </section>

  <section class="section">
    <h2>Node Labels</h2>
    <ul class="legend list-reset">
      {#each $labelOptions as label}
        <li><label class="checkbox-row"><input type="checkbox" checked={$activeLabels.has(label)} onchange={() => toggleInSet(activeLabels, label)} /> <span class="legend-dot" style={`background:${labelColor(label)}`}></span>{label}</label></li>
      {/each}
    </ul>
  </section>

  <section class="section">
    <h2>Archetypes</h2>
    <div class="scroll-y">
    <ul class="list-reset">
      {#each $archetypeOptions as a}
        <li><label class="checkbox-row"><input type="checkbox" checked={$activeArchetypes.has(a)} onchange={() => toggleInSet(activeArchetypes, a)} /> {a}</label></li>
      {/each}
    </ul>
    </div>
  </section>

  <section class="section">
    <h2>Relationships</h2>
    <ul class="list-reset">
      {#each REL_OPTIONS as r}
        <li><label class="checkbox-row"><input type="checkbox" checked={$relationshipFilters.has(r)} onchange={() => toggleInSet(relationshipFilters, r)} /> {r.replace('_',' ')}</label></li>
      {/each}
    </ul>
  </section>

  <section class="section">
    <h2>Mechanic Filter</h2>
    <Combobox placeholder="Filter mechanics…" items={mechanicItems()} value={$mechanicFilter || ''} onSelect={onMechanicSelect} />
  </section>
</aside>



