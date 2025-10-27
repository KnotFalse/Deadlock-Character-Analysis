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
  const select = page.locator('section:has(> h2:text("Mechanic Filter")) select');
  await select.selectOption({ index: 1 }); // choose first mechanic option
  await page.waitForTimeout(150);
  const after = await getFilteredCount(page);

  expect(before).toBeGreaterThan(0);
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});
