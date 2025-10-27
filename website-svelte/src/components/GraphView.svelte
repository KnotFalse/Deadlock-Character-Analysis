<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Sigma from 'sigma';
  import Graph from 'graphology';
  import type { GraphData } from '../types';
  import { selectedNodeId, selectedEdgeId, neighborIds, neighborEdgeIds, shortestPath, pathEdgeIds, metricSizes, metricColors, searchResults } from '../stores/graph';
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
    sigma.on('clickNode', (e) => { selectedNodeId.set(e.node as string); selectedEdgeId.set(null); });
    sigma.on('clickEdge', (e) => { selectedEdgeId.set(e.edge as string); });
  });
  onDestroy(() => { sigma?.kill(); sigma = null; });
  $: if (sigma && data) {
    const g = sigma.getGraph();
    const neighborSet = $neighborIds; const neighborEdgeSet = $neighborEdgeIds; const pathSet = new Set($shortestPath); const pathEdges = $pathEdgeIds; const mSizes = $metricSizes; const mColors = $metricColors; const srch = new Set($searchResults.map(n=>n.id));
    g.forEachNode((n)=>{
      const baseColor = g.getNodeAttribute(n,'color') as string;
      let color = mColors.get(n) ?? baseColor; let size = mSizes.get(n) ?? g.getNodeAttribute(n,'size');
      if (srch.size>0) color = srch.has(n) ? '#60a5fa' : '#cbd5f5';
      if (neighborSet.has(n)) { color = '#34d399'; size = (size as number)+0.9; }
      if (pathSet.has(n)) { color = '#facc15'; size = (size as number)+1.1; }
      if ($selectedNodeId && n===$selectedNodeId) { color = '#f97316'; size = (size as number)+1.3; }
      g.setNodeAttribute(n,'color',color); g.setNodeAttribute(n,'size',size as number);
    });
    g.forEachEdge((e)=>{
      const base = g.getEdgeAttribute(e,'color') as string; let color = base; let size = g.getEdgeAttribute(e,'size') as number ?? 1;
      if (neighborEdgeSet.has(e)) { color='#34d399'; size = Math.max(size, 1.75); }
      if (pathEdges.has(e)) { color='#facc15'; size = Math.max(size, 2); }
      if ($selectedEdgeId && e===$selectedEdgeId) { color='#f97316'; size = Math.max(size, 2.25); }
      g.setEdgeAttribute(e,'color',color); g.setEdgeAttribute(e,'size',size);
    });
  }
</script>

<div bind:this={container} style="width:100%;height:600px;border-radius:12px;border:1px solid #e2e8f0"></div>
