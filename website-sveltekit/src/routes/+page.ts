import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ fetch }) => {
  let lastErr: any = null;
  for (const path of ['graph.json', '/graph.json']) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) {
        const graph = await res.json();
        return { graph };
      }
      lastErr = new Error(`fetch ${path} status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  return { graph: null, loadError: String(lastErr ?? 'unknown load error') } as any;
};
