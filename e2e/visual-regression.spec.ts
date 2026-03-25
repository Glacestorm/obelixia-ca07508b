/**
 * D2: Visual Regression Tests — AI Command Center
 * Captures screenshots of key views for comparison
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

async function openAICenter(page: any) {
  await page.goto(`${BASE_URL}/obelixia-admin/erp`);
  await page.waitForLoadState('networkidle');
  const iaCenterButton = page.locator('text=IA Center').first();
  if (await iaCenterButton.isVisible()) {
    await iaCenterButton.click();
  }
  await page.waitForTimeout(1500);
}

test.describe('AI Command Center — Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('D2.1 — Live Hub screenshot', async ({ page }) => {
    await openAICenter(page);
    await expect(page.locator('text=AI Command Center')).toBeVisible();
    await expect(page).toHaveScreenshot('ai-center-live-hub.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });

  test('D2.2 — Catalog grid screenshot', async ({ page }) => {
    await openAICenter(page);
    await page.locator('[role="tab"]:has-text("Catálogo")').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('ai-center-catalog.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });

  test('D2.3 — Mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openAICenter(page);
    await expect(page).toHaveScreenshot('ai-center-mobile.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });

  test('D2.4 — Governance tab screenshot', async ({ page }) => {
    await openAICenter(page);
    await page.locator('[role="tab"]:has-text("Cumplimiento")').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('ai-center-governance.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });

  test('D2.5 — Orchestration tab screenshot', async ({ page }) => {
    await openAICenter(page);
    await page.locator('[role="tab"]:has-text("Orquestación")').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('ai-center-orchestration.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });
});
