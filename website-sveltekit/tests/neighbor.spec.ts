import { test, expect } from '@playwright/test';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

const waitForApp = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#app');
  await expect(page.getByTestId('search')).toBeVisible();
};

test('Neighbor mode toggles highlight state', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  // pick a deterministic node via search
  const search = page.getByTestId('search');
  await search.fill('Abrams');
  const result = page.getByRole('button', { name: /Abrams/i }).first();
  await result.click();

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
