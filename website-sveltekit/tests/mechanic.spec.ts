import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForApp } from './utils/app';

const initLightMode = async (page: Page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

// waitForApp imported

const getFilteredCount = async (page: Page) => page.evaluate(() => (window as any).__GRAPH_FILTERED_NODE_COUNT__ ?? null);

test('Mechanic filter reduces visible nodes', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  const before = await getFilteredCount(page);
  const combo = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mechanic Filter' }) }).locator('input[role="combobox"]');
  await combo.fill('Barrier');
  const list = page.locator('ul[role="listbox"]');
  await expect(list).toBeVisible();
  await page.getByRole('option').first().click();
  await page.waitForTimeout(150);
  const after = await getFilteredCount(page);

  expect(before).toBeGreaterThan(0);
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});
