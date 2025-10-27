import { test, expect } from '@playwright/test';

test('No-path message appears for identical start/end', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Choose a deterministic character
  await page.getByTestId('search').fill('Abrams');
  await page.getByRole('button', { name: /Abrams/i }).first().click();

  // Set both start and end to the same node id
  await page.selectOption('#start', 'character:Abrams');
  await page.selectOption('#end', 'character:Abrams');

  await expect(page.getByTestId('no-path')).toBeVisible();
});

