import { test, expect } from '@playwright/test';
import { waitForApp, searchFor } from './utils/app';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

// helpers imported

test('Relationship detail drawer opens and clears', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);
  await searchFor(page, 'Abrams');
  const relGroup = page.getByTestId('rel-group-strong_against');
  const rel = relGroup.locator('.relationship').first();
  await expect(rel).toBeVisible();
  await rel.click();

  await expect(page.getByText('Relationship Detail')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('Relationship Detail')).toHaveCount(0);
});

