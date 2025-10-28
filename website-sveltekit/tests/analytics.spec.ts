import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForApp } from './utils/app';

const initLightMode = async (page: Page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

// waitForApp imported

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
