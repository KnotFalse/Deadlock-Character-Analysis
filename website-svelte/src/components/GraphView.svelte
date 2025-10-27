<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Sigma from 'sigma';
  import Graph from 'graphology';
  import type { GraphData } from '../types';
  export let data: GraphData | null = null;
  let container: HTMLDivElement;
  let sigma: Sigma | null = null;

  onMount(() => {
    if (!data) return;
    const g = new Graph({ type: 'undirected', allowSelfLoops: true });
    data.nodes.forEach((n) => {
      g.addNode(n.id, {
        label: (n.properties?.name as string) ?? n.id,
        x: n.x ?? Math.random() * 10,
        y: n.y ?? Math.random() * 10,
        size: n.size,
        color: '#334155',
        raw: n,
      });
    });
    data.edges.forEach((e) => {
      if (g.hasNode(e.source) && g.hasNode(e.target))
        g.addEdgeWithKey(e.id, e.source, e.target, {
          label: e.type,
          color: '#94a3b8',
          raw: e,
        });
    });
    sigma = new Sigma(g, container, { renderLabels: true });
  });
  onDestroy(() => { sigma?.kill(); sigma = null; });
</script>

<div bind:this={container} style="width:100%;height:600px;border-radius:12px;border:1px solid #e2e8f0"></div>

