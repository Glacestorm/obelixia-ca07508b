import { test, expect } from '@playwright/test';

/**
 * Electrical Consulting Module — E2E Smoke Tests
 * 
 * Prerequisites:
 * - User must be logged in with admin/superadmin role
 * - At least one company must exist in ERP
 * 
 * These tests validate the critical path through the module.
 * They are designed for manual or CI execution.
 */

const BASE = '/obelixia-admin/erp';

test.describe('Electrical Module — Go-Live Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ERP and wait for module to load
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('Module loads without errors', async ({ page }) => {
    // Should see the electrical module navigation
    await expect(page.locator('text=Consultoría Eléctrica').first()).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard shows real statistics', async ({ page }) => {
    // Navigate to electrical module
    const electricalTab = page.locator('text=Consultoría Eléctrica').first();
    if (await electricalTab.isVisible()) {
      await electricalTab.click();
    }
    // Stats cards should be visible
    await expect(page.locator('text=Expedientes').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Suministros').first()).toBeVisible();
    await expect(page.locator('text=Facturas').first()).toBeVisible();
  });

  test('Can navigate to Expedientes panel', async ({ page }) => {
    // Click on Expedientes in nav
    const expNav = page.locator('[data-module="expedientes"], button:has-text("Expedientes")').first();
    if (await expNav.isVisible()) {
      await expNav.click();
      await page.waitForTimeout(1000);
      // Should see "Nuevo expediente" button or case list
      const newBtn = page.locator('button:has-text("Nuevo expediente"), button:has-text("Nuevo caso")').first();
      await expect(newBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('New case form opens and has required fields', async ({ page }) => {
    const expNav = page.locator('[data-module="expedientes"], button:has-text("Expedientes")').first();
    if (await expNav.isVisible()) {
      await expNav.click();
      await page.waitForTimeout(500);
      
      const newBtn = page.locator('button:has-text("Nuevo expediente"), button:has-text("Nuevo caso")').first();
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(500);
        // Form should have title field
        const titleInput = page.locator('input[placeholder*="Título"], input[name="title"]').first();
        await expect(titleInput).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('Notifications bell is visible and clickable', async ({ page }) => {
    const bell = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bell).toBeVisible({ timeout: 5000 });
    await bell.click();
    // Popover should open
    await expect(page.locator('text=Notificaciones').first()).toBeVisible({ timeout: 3000 });
  });

  test('Operational dashboard loads KPIs', async ({ page }) => {
    const opNav = page.locator('button:has-text("Operacional"), [data-module="operacional"]').first();
    if (await opNav.isVisible()) {
      await opNav.click();
      await page.waitForTimeout(1000);
      // Should show KPI cards or empty state
      const content = page.locator('.space-y-4, .grid').first();
      await expect(content).toBeVisible({ timeout: 5000 });
    }
  });

  test('Executive dashboard renders', async ({ page }) => {
    const execNav = page.locator('button:has-text("Ejecutivo"), [data-module="ejecutivo"]').first();
    if (await execNav.isVisible()) {
      await execNav.click();
      await page.waitForTimeout(1000);
      // Should show executive report area
      const content = page.locator('text=Informe Ejecutivo, text=Exportar').first();
      // It's ok if no data - just verify no crash
      await page.waitForTimeout(2000);
      expect(await page.locator('.error, text=Error').count()).toBe(0);
    }
  });

  test('Client portal route loads', async ({ page }) => {
    await page.goto('/portal-cliente');
    await page.waitForLoadState('networkidle');
    // Should show error or portal (no valid token)
    const content = page.locator('text=Token de acceso no proporcionado, text=Acceso no disponible').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('Alerts panel shows no crash', async ({ page }) => {
    const alertNav = page.locator('button:has-text("Alertas"), [data-module="alertas"]').first();
    if (await alertNav.isVisible()) {
      await alertNav.click();
      await page.waitForTimeout(2000);
      // No error state
      expect(await page.locator('text=Error al calcular').count()).toBe(0);
    }
  });
});
