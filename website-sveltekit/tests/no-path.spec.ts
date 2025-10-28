import { test, expect } from '@playwright/test';
import { waitForApp } from './utils/app';

test('No-path message appears for identical start/end', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; });
  await waitForApp(page);

  // Choose a deterministic character
  await page.getByTestId('search').fill('Abrams');
  await page.getByTestId('search-results').waitFor({ state: 'visible' });
  await page.getByTestId('search-results').getByRole('option', { name: /Abrams/i }).first().click();

  // Set both start and end to the same node via comboboxes
  const start = page.getByTestId('path-start');
  await start.fill('Abrams');
  await page.getByRole('option', { name: /Abrams/i }).first().click();
  const end = page.getByTestId('path-end');
  await end.fill('Abrams');
  await page.getByRole('option', { name: /Abrams/i }).first().click();

  await expect(page.getByTestId('no-path')).toBeVisible();
});

