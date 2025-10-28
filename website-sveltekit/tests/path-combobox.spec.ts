import { test, expect } from '@playwright/test';
import { waitForApp } from './utils/app';

test('Path Tools combobox: type to select; path renders; clear resets', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; });
  await waitForApp(page);

  // Start: choose Abrams
  const start = page.getByTestId('path-start');
  await start.fill('Abrams');
  await page.getByRole('option', { name: /Abrams/i }).first().click();

  // End: choose any non-Abrams node
  const end = page.getByTestId('path-end');
  await end.click();
  await page.getByRole('listbox').waitFor({ state: 'visible' });
  const options = page.getByRole('option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const t = (await options.nth(i).textContent())?.trim() || '';
    if (!/Abrams/i.test(t)) { await options.nth(i).click(); break; }
  }

  const pathCount = await page.locator('.path-summary .path-list li').count();
  expect(pathCount).toBeGreaterThan(0);

  // Clear start combobox using the Clear button (x)
  const clearButtons = page.locator('.cbx-clear');
  await clearButtons.first().click();
  await expect(page.getByTestId('path-start')).toHaveValue('');
});
