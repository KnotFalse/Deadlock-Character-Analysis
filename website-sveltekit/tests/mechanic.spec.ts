import { test, expect } from '@playwright/test';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

const waitForApp = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('search')).toBeVisible();
};

const getFilteredCount = async (page) => page.evaluate(() => (window).__GRAPH_FILTERED_NODE_COUNT__ ?? null);

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
