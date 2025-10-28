import { test, expect } from '@playwright/test';

test('Relationship panel shows 3 columns with headings including selected name', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Select a known character
  await page.getByTestId('search').fill('Abrams');
  await page.getByTestId('search-results').waitFor({ state: 'visible' });
  await page.getByTestId('search-results').getByRole('option', { name: /Abrams/i }).first().click();

  // Open the Relationship panel disclosure
  await page.getByRole('button', { name: 'Relationship Panel' }).click();
  const container = page.locator('.rel-grid');
  await expect(container).toBeVisible();
  const headings = container.getByRole('heading', { level: 4 });
  await expect(headings).toHaveCount(3);
  const texts = await headings.allTextContents();
  expect(texts.every(t => /Abrams/i.test(t))).toBeTruthy();
});

