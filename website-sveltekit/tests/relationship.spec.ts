import { test, expect } from '@playwright/test';

const initLightMode = async (page) => {
  await page.addInitScript(() => { (window).__GRAPH_LIGHT_MODE__ = true; });
};

const waitForApp = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('search')).toBeVisible();
};

const searchFor = async (page, name) => {
  const search = page.getByTestId('search');
  await search.fill(name);
  await page.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
};

test('Relationship detail drawer opens and clears', async ({ page }) => {
  await initLightMode(page);
  await waitForApp(page);

  await searchFor(page, 'Abrams');
  const rel = page.locator('.relationship-summary .relationship').first();
  await expect(rel).toBeVisible();
  await rel.click();

  await expect(page.getByText('Relationship Detail')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('Relationship Detail')).toHaveCount(0);
});
