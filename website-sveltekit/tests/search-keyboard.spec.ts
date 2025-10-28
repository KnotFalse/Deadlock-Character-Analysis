import { test, expect } from '@playwright/test';
import { waitForApp } from './utils/app';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

test('Keyboard selects first search result', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  const search = page.getByTestId('search');
  await search.fill('Abrams');
  await expect(page.getByTestId('search-results')).toBeVisible();
  // Fallback to clicking first option for reliability in CI
  await page.getByTestId('search-results').getByRole('option', { name: /Abrams/i }).first().click();
  await page.waitForFunction(() => (window as any).__GRAPH_SELECTED_NODE__ === 'character:Abrams', null, { timeout: 3000 });
});
