<script lang="ts">
  // Svelte 5 runes
  type Item = { label: string; value: string; meta?: any };
  const props = $props<{ items?: Item[]; placeholder?: string; value?: string; maxItems?: number; onSelect?: (v: string, item?: Item) => void; onQuery?: (q: string) => void; testIdInput?: string; testIdList?: string; listId?: string }>();
  const items = props.items ?? [];
  const placeholder = props.placeholder ?? '';
  const value = props.value ?? '';
  const maxItems = props.maxItems ?? 10;
  const onSelect = props.onSelect;

  let open = $state(false);
  let query = $state('');
  let currentValue = $state(value);
  let activeIndex = $state<number>(-1);
  let rootEl: HTMLDivElement;
  let inputEl: HTMLInputElement;
  const listId = props.listId ?? 'cbx-list';

  function filtered(): Item[] {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, maxItems);
    return items.filter(i => i.label.toLowerCase().includes(q)).slice(0, maxItems);
  }
  function selectAt(idx: number) {
    const list = filtered();
    if (idx < 0 || idx >= list.length) return;
    const it = list[idx];
    currentValue = it.label;
    open = false;
    activeIndex = -1;
    onSelect?.(it.value, it);
  }
  function clear() {
    query = '';
    currentValue = '';
    activeIndex = -1;
    onSelect?.('', undefined);
    inputEl?.focus();
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
    const list = filtered();
    if (e.key === 'ArrowDown') { activeIndex = Math.min((activeIndex < 0 ? 0 : activeIndex + 1), list.length - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { activeIndex = Math.max((activeIndex < 0 ? list.length - 1 : activeIndex - 1), 0); e.preventDefault(); }
    else if (e.key === 'Enter') { if (open && activeIndex >= 0) { selectAt(activeIndex); e.preventDefault(); } }
    else if (e.key === 'Escape') { open = false; activeIndex = -1; }
  }
  function onBlur() {
    // Defer to allow option click
    setTimeout(() => { open = false; }, 100);
  }
</script>

<div class="cbx" bind:this={rootEl}>
  <div class="cbx-input">
    <input class="input" placeholder={placeholder} bind:this={inputEl} value={currentValue} oninput={onInput} onkeydown={onKey} onfocus={() => (open = true)} onblur={onBlur}
      role="combobox" aria-expanded={open ? 'true' : 'false'} aria-autocomplete="list" aria-controls={listId} data-testid={props.testIdInput} />
    {#if currentValue}
      <button class="cbx-clear" title="Clear" onclick={clear} aria-label="Clear">×</button>
    {/if}
  </div>
  {#if open}
    <ul id={listId} class="cbx-list" role="listbox" data-testid={props.testIdList}>
      {#each filtered() as it, i}
        <li>
          <button class="cbx-option" role="option" aria-selected={i===activeIndex ? 'true' : 'false'} onclick={() => selectAt(i)}>
            {it.label}
          </button>
        </li>
      {/each}
      {#if filtered().length === 0}
        <li><div class="muted" style="padding:0.5rem 0.65rem">No matches</div></li>
      {/if}
    </ul>
  {/if}
</div>
