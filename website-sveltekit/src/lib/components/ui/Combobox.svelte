<script lang="ts">
  // Svelte 5 runes
  type Item = { label: string; value: string; meta?: any };
  const props = $props<{ items?: Item[]; placeholder?: string; value?: string; maxItems?: number; onSelect?: (v: string, item?: Item) => void; onQuery?: (q: string) => void; testIdInput?: string; testIdList?: string; listId?: string }>();

  let open = $state(false);
  let query = $state('');
  let currentValue = $state(props.value ?? '');
  let activeIndex = $state<number>(-1);
  let rootEl: HTMLDivElement;
  let inputEl: HTMLInputElement;
  const listId = props.listId ?? 'cbx-list';
  let uid = $state(Math.random().toString(36).slice(2));

  let filtered = $state<Item[]>([]);
  $effect(() => {
    const list = props.items ?? [];
    const q = query.trim().toLowerCase();
    const limit = props.maxItems ?? 10;
    filtered = (q ? list.filter((i: Item) => i.label.toLowerCase().includes(q)) : list).slice(0, limit);
  });
  function selectAt(idx: number) {
    const list: Item[] = filtered;
    if (idx < 0 || idx >= list.length) return;
    const it = list[idx];
    currentValue = it.label;
    open = false;
    activeIndex = -1;
    props.onSelect?.(it.value, it);
    // Do not refocus automatically; avoids reopening onfocus lists in other comboboxes
  }
  function clear() {
    query = '';
    currentValue = '';
    activeIndex = -1;
    props.onSelect?.('', undefined);
    // Do not refocus automatically
  }
  function onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    query = v;
    currentValue = v;
    open = true;
    activeIndex = 0;
    props.onQuery?.(v);
  }
  function onKey(e: KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { open = true; }
    const list = filtered;
    if (e.key === 'ArrowDown') {
      activeIndex = (activeIndex < 0) ? 0 : Math.min(activeIndex + 1, list.length - 1);
      e.preventDefault();
    }
    else if (e.key === 'ArrowUp') {
      activeIndex = (activeIndex < 0) ? (list.length - 1) : Math.max(activeIndex - 1, 0);
      e.preventDefault();
    }
    else if (e.key === 'Enter') {
      if (open) {
        if (activeIndex < 0) activeIndex = 0;
        if (list.length > 0) { selectAt(activeIndex); e.preventDefault(); }
      }
    }
    else if (e.key === 'Escape') { open = false; activeIndex = -1; }
  }
  function onBlur() {
    // Defer to allow option click
    setTimeout(() => { open = false; }, 100);
  }

  // React to parent-driven value changes (e.g., programmatic selection/clear)
  $effect(() => {
    const next = props.value ?? '';
    if (next !== currentValue) {
      currentValue = next;
      if (!next) query = '';
    }
  });
</script>

<div class="cbx" bind:this={rootEl}>
  <div class="cbx-input">
    <input class="input" placeholder={props.placeholder ?? ''} bind:this={inputEl} value={currentValue} oninput={onInput} onkeydown={onKey} onfocus={() => (open = true)} onblur={onBlur}
      role="combobox" aria-expanded={open ? 'true' : 'false'} aria-autocomplete="list" aria-controls={listId} aria-activedescendant={open && activeIndex>=0 ? `${listId}-opt-${uid}-${activeIndex}` : undefined} data-testid={props.testIdInput} />
    {#if currentValue}
      <button class="cbx-clear" title="Clear" onclick={clear} aria-label="Clear">×</button>
    {/if}
  </div>
  {#if open}
    <ul id={listId} class="cbx-list" role="listbox" data-testid={props.testIdList}>
      {#each filtered as it, i}
        <li id={`${listId}-opt-${uid}-${i}`} class="cbx-option" role="option" aria-selected={i===activeIndex ? 'true' : 'false'} onclick={() => selectAt(i)} onkeydown={(e) => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); selectAt(i); } }} tabindex="0">
          {it.label}
        </li>
      {/each}
      {#if filtered.length === 0}
        <li><div class="muted" style="padding:0.5rem 0.65rem">No matches</div></li>
      {/if}
    </ul>
  {/if}
</div>
