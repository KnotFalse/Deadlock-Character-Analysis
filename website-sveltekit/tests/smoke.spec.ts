import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForApp, searchFor } from './utils/app';

const initLightMode = async (page: Page) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; (window as any).__PERF_LOG__ = true; (window as any).__PERF_LOG__ = true; });
};

// helpers imported

test('Svelte explorer — core interactions', async ({ page }) => {
  page.on('console', (m) => console.log(`[browser:${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await initLightMode(page);
  await waitForApp(page);
  await searchFor(page, 'Abrams');
  await expect(page.locator('.relationship-summary')).toBeVisible();

  // Path: use selection as start, pick a deterministic end via combobox
  await page.getByRole('button', { name: 'Use selection as start' }).click();
  const endCbx = page.getByTestId('path-end');
  await endCbx.click();
  // Show list and select first non-Abrams option
  await page.getByRole('listbox').waitFor({ state: 'visible' });
  const endOptions = page.getByRole('option');
  const count = await endOptions.count();
  for (let i = 0; i < count; i++) {
    const text = (await endOptions.nth(i).textContent())?.trim() || '';
    if (!/Abrams/i.test(text)) { await endOptions.nth(i).click(); break; }
  }
  const pathCount = await page.locator('.path-summary .path-list li').count();
  expect(pathCount).toBeGreaterThan(0);

  // Analytics toggles and mechanic filtering
  await page.getByRole('button', { name: 'Strong Matchups', exact: true }).click();
  await expect(page.locator('.analytics-panel')).toBeVisible();

  await page.getByRole('button', { name: 'Mechanic Usage', exact: true }).click();
  const mechBtn = page.locator('.analytics-card').nth(2).locator('.link-button').first();
  await expect(mechBtn).toBeVisible();
  const mechValue = (await mechBtn.textContent())?.trim();
  await mechBtn.click();
  if (mechValue) {
    const combo = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mechanic Filter' }) }).locator('input[role="combobox"]');
    await expect(combo).toHaveValue(mechValue);
  }
});

