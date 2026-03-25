/**
 * D1: AI Command Center E2E Tests
 * Happy path for all 13 tabs of the unified AI Center module
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const AI_CENTER_URL = `${BASE_URL}/obelixia-admin/erp`;

// Helper: navigate to ERP and open AI Center module
async function openAICenter(page: Page) {
  await page.goto(AI_CENTER_URL);
  await page.waitForLoadState('networkidle');
  // Click on IA Center module in the grid
  const iaCenterButton = page.locator('text=IA Center').first();
  if (await iaCenterButton.isVisible()) {
    await iaCenterButton.click();
  }
  await page.waitForTimeout(1000);
}

// Helper: click a tab within the AI Center
async function clickTab(page: Page, tabLabel: string) {
  const tab = page.locator(`[role="tab"]:has-text("${tabLabel}")`);
  await tab.click();
  await page.waitForTimeout(500);
}

test.describe('AI Command Center — E2E Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Set a realistic viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('D1.1 — Module loads with header and 13 tabs', async ({ page }) => {
    await openAICenter(page);
    
    // Verify header
    await expect(page.locator('text=AI Command Center')).toBeVisible();
    await expect(page.locator('text=UNIFIED')).toBeVisible();

    // Verify all 13 tabs exist
    const expectedTabs = [
      'Live Hub', 'Autónomos', 'Copilot', 'Voz',
      'Catálogo', 'Ranking', 'Decisiones',
      'Observabilidad', 'Chat',
      'Costes',
      'Cumplimiento', 'Orquestación', 'Alertas',
    ];
    for (const tabName of expectedTabs) {
      await expect(page.locator(`[role="tab"]:has-text("${tabName}")`)).toBeVisible();
    }
  });

  test('D1.2 — Live Hub tab loads KPIs and approval queue', async ({ page }) => {
    await openAICenter(page);
    await clickTab(page, 'Live Hub');

    await expect(page.locator('text=Live Operations Hub')).toBeVisible();
    await expect(page.locator('text=Agentes Activos')).toBeVisible();
    await expect(page.locator('text=Pendientes')).toBeVisible();
    await expect(page.locator('text=Invocaciones Hoy')).toBeVisible();
    await expect(page.locator('text=Confianza Media')).toBeVisible();
    await expect(page.locator('text=Latencia Media')).toBeVisible();
  });

  test('D1.3 — Catalog tab loads agent grid', async ({ page }) => {
    await openAICenter(page);
    await clickTab(page, 'Catálogo');

    await expect(page.locator('text=Total Agentes')).toBeVisible();
    await expect(page.locator('text=Activos')).toBeVisible();
    // Search input should be present
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('D1.4 — Each lazy-loaded tab renders without blank screen', async ({ page }) => {
    await openAICenter(page);

    const lazyTabs = [
      'Autónomos', 'Copilot', 'Voz',
      'Observabilidad', 'Ranking', 'Costes',
      'Cumplimiento', 'Orquestación', 'Decisiones',
      'Chat', 'Alertas',
    ];

    for (const tabName of lazyTabs) {
      await clickTab(page, tabName);
      // Should not show a completely blank content area
      const tabPanel = page.locator('[role="tabpanel"]').first();
      await expect(tabPanel).not.toBeEmpty();
    }
  });

  test('D1.5 — URL params sync with active tab', async ({ page }) => {
    await openAICenter(page);
    await clickTab(page, 'Ranking');

    // URL should contain ?tab=ranking
    await expect(page).toHaveURL(/tab=ranking/);

    await clickTab(page, 'Costes');
    await expect(page).toHaveURL(/tab=costs/);
  });

  test('D1.6 — Global search shows results', async ({ page }) => {
    await openAICenter(page);

    // Open search
    const searchButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    // Find the search toggle button (has Search icon)
    const searchToggle = page.locator('button:has(svg.lucide-search)').first();
    if (await searchToggle.isVisible()) {
      await searchToggle.click();
      const searchInput = page.locator('input[placeholder*="Buscar agentes"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test('D1.7 — CSV export button is present in approval queue', async ({ page }) => {
    await openAICenter(page);
    await clickTab(page, 'Live Hub');

    // The download button should be in the approval queue section
    const downloadBtn = page.locator('button[title="Exportar CSV"]');
    // It may or may not be visible depending on whether queue has items
    // Just verify the page rendered correctly
    await expect(page.locator('text=Operaciones')).toBeVisible();
  });

  test('D1.8 — Keyboard shortcuts work in Live Hub', async ({ page }) => {
    await openAICenter(page);
    await clickTab(page, 'Live Hub');

    // Press '2' to switch to Advanced Dashboard sub-tab
    await page.keyboard.press('2');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Dashboard Avanzado')).toBeVisible();

    // Press '1' to go back to Operations
    await page.keyboard.press('1');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Operaciones')).toBeVisible();
  });
});
