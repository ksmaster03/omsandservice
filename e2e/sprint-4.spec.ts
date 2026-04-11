import { test, expect } from '@playwright/test';

test.describe('Sprint 4 — Renewals + WMS + Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Warranty Renewal page renders with candidates + offers tabs', async ({ page }) => {
    await page.getByRole('link', { name: /ต่อประกัน/ }).click();
    await expect(page).toHaveURL(/\/renewals/);
    await expect(page.getByRole('heading', { name: 'ต่อประกัน' })).toBeVisible();
    await expect(page.getByRole('button', { name: /รอเสนอ/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ข้อเสนอทั้งหมด/ })).toBeVisible();
  });

  test('Reports page renders KPI sections and charts', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole('heading', { name: /Reports/ })).toBeVisible();
    // KPI labels
    await expect(page.getByText('ลูกค้าทั้งหมด').first()).toBeVisible();
    await expect(page.getByText(/รายได้เดือนนี้/).first()).toBeVisible();
    // Chart headers
    await expect(page.getByText(/Pipeline — มูลค่าตามสถานะ/)).toBeVisible();
    await expect(page.getByText(/ยอดขายแยกตามแบรนด์/)).toBeVisible();
  });

  test('Admin can access WMS integration page', async ({ page }) => {
    await page.getByRole('link', { name: /WMS Integration/ }).click();
    await expect(page).toHaveURL(/\/wms/);
    await expect(page.getByRole('heading', { name: 'WMS Integration' })).toBeVisible();
    // Adapter badge
    await expect(page.getByText(/Adapter: MOCK/)).toBeVisible();
  });
});
