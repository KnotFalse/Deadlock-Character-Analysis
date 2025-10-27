import { test, expect } from '@playwright/test';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

test('Keyboard selects first search result', async ({ page }) => {
  await initLightMode(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const search = page.getByTestId('search');
  await search.fill('Abrams');
  await expect(page.getByTestId('search-results')).toBeVisible();

  await search.press('ArrowDown');
  await search.press('Enter');

  const selected = await page.evaluate(() => (window).__GRAPH_SELECTED_NODE__);
  expect(selected).toBe('character:Abrams');
});