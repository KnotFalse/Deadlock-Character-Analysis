import { test, expect, Page } from '@playwright/test';
import { waitForApp } from './utils/app';

const init = async (page: Page) => {
  await page.addInitScript(() => { (window as any).__GRAPH_LIGHT_MODE__ = true; (window as any).__PERF_LOG__ = true; });
};

// Informational budgets (non-gating advisories)
const budgets = {
  neighbor: 100,  // ms
  search: 400     // ms (includes 200ms debounce)
};

test('Perf advisories — neighbor and search (non-gating)', async ({ page }) => {
  await init(page);
  const logs: string[] = [];
  page.on('console', m => { if (m.type() === 'log') logs.push(m.text()); });
  await waitForApp(page);

  // Trigger neighbor once
  await page.getByTestId('search').fill('Abrams');
  await expect(page.getByTestId('search-results')).toBeVisible();
  await page.getByTestId('search-results').getByRole('option', { name: /Abrams/i }).first().click();
  await page.getByTestId('neighbor-toggle').check();
  await page.waitForTimeout(100);

  // Trigger search once (includes debounce)
  await page.getByTestId('search').fill('Ab');
  await page.waitForTimeout(450); // allow debounce + highlight

  const parse = (name: string) => {
    const re = new RegExp(`^\\[perf\\] ${name}: (\\d+\\.\\d+)ms$`);
    const line = logs.reverse().find(l => re.test(l));
    if (!line) return null;
    const m = line.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const neigh = parse('neighbor-toggle');
  const srch = parse('search-input');
  if (neigh != null && neigh > budgets.neighbor) console.warn(`[perf-advisory] neighbor ${neigh.toFixed(1)}ms > ${budgets.neighbor}ms`);
  if (srch != null && srch > budgets.search) console.warn(`[perf-advisory] search ${srch.toFixed(1)}ms > ${budgets.search}ms`);

  // Non-gating: do not assert on budgets
  await expect(page.getByTestId('search')).toBeVisible();
});

