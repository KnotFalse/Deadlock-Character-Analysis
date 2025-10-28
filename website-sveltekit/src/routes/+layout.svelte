<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
  let { children } = $props();
  let theme: 'dark'|'light' = 'dark';
  function applyTheme(t: 'dark'|'light'){
    theme = t;
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', t);
    try { if (typeof localStorage!=='undefined') localStorage.setItem('theme', t); } catch {}
  }
  if (typeof window !== 'undefined') {
    const stored = (localStorage.getItem('theme') as 'dark'|'light' | null);
    applyTheme(stored || 'dark');
  }
  function toggleTheme(){ applyTheme(theme==='dark' ? 'light' : 'dark'); }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
  <div style="display:flex;justify-content:flex-end;margin-bottom:var(--gap-sm)">
    <button class="button button--pill" on:click={toggleTheme} aria-label="Toggle theme">{theme==='dark' ? 'Dark' : 'Light'} mode</button>
  </div>
  {@render children?.()}
  </div>
