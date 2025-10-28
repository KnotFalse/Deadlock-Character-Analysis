import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('graph.json', { cache: 'no-store' });
  const graph = await res.json();
  return { graph };
};

