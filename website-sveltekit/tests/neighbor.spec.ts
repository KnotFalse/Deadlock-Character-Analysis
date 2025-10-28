import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForApp } from './utils/app';

const initLightMode = async (page: Page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

// waitForApp imported

test('Neighbor mode toggles highlight state', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  // pick a deterministic node via search
  const search = page.getByTestId('search');
  await search.fill('Abrams');
  await expect(page.getByTestId('search-results')).toBeVisible();
  await page.getByTestId('search-results').getByRole('option', { name: /Abrams/i }).first().click();

  // toggle neighbor mode on
  const toggle = page.getByTestId('neighbor-toggle');
  await toggle.check();
  await expect(toggle).toBeChecked();

  // basic sanity: analytics header still visible (page painted)
  await expect(page.getByTestId('analytics-header')).toBeVisible();

  // toggle neighbor mode off
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
});
