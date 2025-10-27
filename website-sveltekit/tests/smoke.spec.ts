import { test, expect, Page } from '@playwright/test';

const initLightMode = async (page: Page) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; (window as any).__PERF_LOG__ = true; (window as any).__PERF_LOG__ = true; });
};

const waitForApp = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#app', { state: 'attached', timeout: 20000 });
  // Search box is present once Svelte has mounted and fetched.
  await expect(page.getByPlaceholder('Search nodes...')).toBeVisible({ timeout: 20000 });
};

const searchFor = async (page: Page, name: string) => {
  const search = page.getByPlaceholder('Search nodes...');
  await expect(search).toBeVisible();
  await search.fill(name);
  await page.waitForTimeout(200);
  const result = page.getByRole('button', { name: new RegExp(`${name}`, 'i') }).first();
  await expect(result).toBeVisible({ timeout: 15000 });
  await result.click();
};

test('Svelte explorer — core interactions', async ({ page }) => {
  page.on('console', (m) => console.log(`[browser:${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await initLightMode(page);
  await page.goto('/');
  await waitForApp(page);

  await searchFor(page, 'Abrams');
  await expect(page.locator('.relationship-summary')).toBeVisible();

  // Path: use selection as start, pick a deterministic end from graph indexes
  await page.getByRole('button', { name: 'Use selection as start' }).click();
  // Choose a deterministic end option from the select list
  const options = await page.$$eval('#end option', opts => opts.map(o => (o as HTMLOptionElement).value).filter(v => v && v !== 'character:Abrams'));
  if (options.length > 0) await page.selectOption('#end', options[0] as string);
  const pathCount = await page.locator('.path-summary .path-list li').count();
  expect(pathCount).toBeGreaterThan(0);

  // Analytics toggles and mechanic filtering
  await page.getByRole('button', { name: 'Strong Matchups', exact: true }).click();
  await expect(page.locator('.analytics-panel')).toBeVisible();

  await page.getByRole('button', { name: 'Mechanic Usage', exact: true }).click();
  const mechBtn = page.locator('.analytics-card').nth(2).locator('.link-button').first();
  await expect(mechBtn).toBeVisible();
  const mechValue = (await mechBtn.textContent())?.trim();
  await mechBtn.click();
  if (mechValue) {
    const select = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mechanic Filter' }) }).locator('select');
    await expect(select).toHaveValue(mechValue);
  }
});

