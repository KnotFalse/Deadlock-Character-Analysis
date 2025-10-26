import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const searchForCharacter = async (page: Page, name: string) => {
  const searchInput = page.getByPlaceholder('Search nodes...');
  await searchInput.fill(name);
  await page.waitForTimeout(200);
  const resultButton = page.getByRole('button', { name: new RegExp(`${name}.*Character`, 'i') }).first();
  await expect(resultButton).toBeVisible({ timeout: 15000 });
  await resultButton.click();
};

test.describe('Deadlock Graph Explorer', () => {
  test('loads graph and exercises core interactions', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__GRAPH_LIGHT_MODE__ = true;
    });
    page.on('console', (message) => {
      console.log(`[browser:${message.type()}] ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      console.log(`[pageerror] ${error.message}`);
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const graphStatus = await page.evaluate(async () => {
      try {
        const response = await fetch('graph.json', { cache: 'no-store' });
        return response.status;
      } catch (error) {
        return `error:${(error as Error).message}`;
      }
    });
    console.log(`[test] graph.json status: ${graphStatus}`);
    const snapshot = await page.content();
    console.log(`[test] initial DOM snippet: ${snapshot.slice(0, 500)}`);
    const scripts = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
    console.log(`[test] scripts: ${scripts.join(', ')}`);
    const immediateApp = await page.evaluate(() => !!document.querySelector('.App'));
    console.log(`[test] App present immediately: ${immediateApp}`);
    await page.waitForFunction(() => !!document.querySelector('.App'), undefined, { timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as any).__GRAPH_DATA__), undefined, { timeout: 20000 });
    await page.waitForSelector('text=Loading graph data…', { state: 'detached', timeout: 20000 }).catch(() => undefined);
    await expect(page.getByPlaceholder('Search nodes...')).toBeVisible({ timeout: 60000 });

    await searchForCharacter(page, 'Abrams');

    await expect(page.locator('.relationship-summary')).toBeVisible();

    const relationshipButton = page.locator('.relationship-summary .relationship').first();
    await expect(relationshipButton).toBeVisible();
    await relationshipButton.click();
    await expect(page.locator('.edge-summary')).toBeVisible();

    const neighborToggle = page.getByLabel('Highlight immediate neighbors of the current selection');
    if (await neighborToggle.isEnabled()) {
      await neighborToggle.check();
    }

    await page.selectOption('#path-start', 'character:Abrams');
    const targetNode = await page.evaluate(() => {
      const data = (window as any).__GRAPH_DATA__;
      if (!data) return null;
      const strong = data.indexes?.strong_against?.['character:Abrams'] ?? [];
      const weak = data.indexes?.weak_against?.['character:Abrams'] ?? [];
      return strong[0] ?? weak[0] ?? null;
    });
    if (targetNode) {
      await page.selectOption('#path-end', targetNode);
    } else {
      const pathEndOptions = await page.$$eval('#path-end option', (options) =>
        options
          .map((option) => option.value)
          .filter((value) => value && value !== 'character:Abrams')
      );
      if (pathEndOptions.length > 0) {
        await page.selectOption('#path-end', pathEndOptions[0] as string);
      }
    }
    const pathCount = await page.locator('.path-summary .path-list li').count();
    expect(pathCount).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Strong Matchups', exact: true }).click();
    await expect(page.locator('.analytics-panel')).toBeVisible();

    const mechanicButton = page.locator('.analytics-card').nth(2).locator('.link-button').first();
    await expect(mechanicButton).toBeVisible();
    const mechanicValue = (await mechanicButton.textContent())?.trim();
    await mechanicButton.click();
    if (mechanicValue) {
      const mechanicSelect = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'Mechanic Filter' }) })
        .locator('select');
      await expect(mechanicSelect).toHaveValue(mechanicValue);
    }
  });

  test('metric toggles and mechanic filtering respond to selections', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__GRAPH_LIGHT_MODE__ = true;
    });
    await page.goto('/');
    await page.waitForFunction(() => !!document.querySelector('.App'), undefined, { timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as any).__GRAPH_DATA__), undefined, { timeout: 20000 });
    const data = await page.evaluate(() => (window as any).__GRAPH_DATA__);
    expect(data).toBeTruthy();

    await page.getByRole('button', { name: 'Strong Matchups', exact: true }).click();
    await expect(page.locator('.analytics-panel')).toBeVisible();

    const strongFirst = await page.locator('.analytics-card').nth(1).locator('.link-button').first();
    await strongFirst.click();
    const selectedStrongId = await strongFirst.textContent();
    if (selectedStrongId) {
      const expectedId = selectedStrongId.trim().split(' ')[0];
      const selectedStoreId = await page.evaluate(() => (window as any).__GRAPH_SELECTED_NODE__);
      expect(selectedStoreId).toBeTruthy();
      if (selectedStoreId) {
        const label = await page.evaluate((id) => {
          const data = (window as any).__GRAPH_DATA__;
          if (!data) return null;
          const node = data.nodes.find((entry: any) => entry.id === id);
          return node?.properties?.name ?? id;
        }, selectedStoreId);
        expect(label).toBeTruthy();
        if (label) {
          expect(label.toString().toLowerCase()).toContain(expectedId.toLowerCase());
        }
      }
    }

    await page.getByRole('button', { name: 'Mechanic Usage', exact: true }).click();
    const mechanicToggleButton = page.locator('.analytics-card').nth(2).locator('.link-button').first();
    await mechanicToggleButton.click();
    const selectedMechanic = (await mechanicToggleButton.textContent())?.trim();
    if (selectedMechanic) {
      const mechanicSelect = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'Mechanic Filter' }) })
        .locator('select');
      await expect(mechanicSelect).toHaveValue(selectedMechanic);
    }

    await page.getByRole('button', { name: 'Default', exact: true }).click();
    await expect(page.locator('[data-testid="graph-light-mode"]')).toBeVisible();
  });
});
