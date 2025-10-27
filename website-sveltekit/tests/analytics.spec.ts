import { test, expect } from '@playwright/test';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

const waitForApp = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#app');
  await expect(page.getByTestId('analytics-header')).toBeVisible();
};

test('Analytics toggles render ranking lists', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  const strongBtn = page.getByTestId('metric-strongCount');
  const mechBtn = page.getByTestId('metric-mechanicUsage');

  await strongBtn.click();
  await expect(page.getByTestId('analytics-grid')).toBeVisible();

  await mechBtn.click();
  await expect(page.getByTestId('analytics-grid')).toBeVisible();
});
