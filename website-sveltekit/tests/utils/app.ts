import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function waitForApp(page: Page) {
  page.on('pageerror', (e) => console.log(`[pageerror] ${e?.message}\n${e?.stack ?? ''}`));
  page.on('console', (m) => console.log(`[browser:${m.type()}] ${m.text()}`));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const scriptReady = await page.waitForFunction(() => {
    const w = window as any;
    return Boolean(w.__GRAPH_READY__ || w.__GRAPH_DATA__ || w.__GRAPH_LOAD_ERROR__);
  }, { timeout: 10000 }).catch(() => null);
  if (!scriptReady) {
    // Attempt UI-based checks if no script flags yet
    const hdr = page.locator('.muted.small', { hasText: 'Generated:' });
    try { await expect(hdr).toBeVisible({ timeout: 3000 }); return; } catch {}
  }
  const loadErr = page.getByTestId('load-error');
  if (await loadErr.isVisible({ timeout: 200 }).catch(() => false)) {
    const msg = await loadErr.textContent();
    throw new Error(`App load error: ${msg}`);
  }
  // Prefer explicit sentinel
  const ready = page.getByTestId('app-ready');
  try {
    await expect(ready).toBeVisible({ timeout: 5000 });
    return;
  } catch {}
  // Fallback to the generated header
  const hdr = page.locator('.muted.small', { hasText: 'Generated:' });
  try {
    await expect(hdr).toBeVisible({ timeout: 5000 });
    return;
  } catch {}
  // Final fallback: search input visible
  const search = page.getByTestId('search');
  await expect(search).toBeVisible({ timeout: 10000 });
}

export async function searchFor(page: Page, term: string) {
  const search = page.getByTestId('search');
  await expect(search).toBeVisible();
  await search.fill(term);
  const list = page.getByTestId('search-results');
  await list.waitFor({ state: 'visible' });
  await list.getByRole('option', { name: new RegExp(term, 'i') }).first().click();
}
