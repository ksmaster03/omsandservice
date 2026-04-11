import { test, expect } from '@playwright/test';

test.describe('Sprint 2 — Sales flow pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Leads page renders pipeline columns', async ({ page }) => {
    await page.getByRole('link', { name: /Sales Pipeline/ }).click();
    await expect(page).toHaveURL(/\/leads/);
    await expect(page.getByRole('heading', { name: 'Sales Pipeline' })).toBeVisible();
    await expect(page.getByText('Lead ใหม่')).toBeVisible();
    await expect(page.getByText('คัดกรอง')).toBeVisible();
    await expect(page.getByText('ต่อรอง')).toBeVisible();
  });

  test('Quotations page renders list + filter', async ({ page }) => {
    await page.getByRole('link', { name: /ใบเสนอราคา/ }).click();
    await expect(page).toHaveURL(/\/quotations/);
    await expect(page.getByRole('heading', { name: 'ใบเสนอราคา' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ออกใบเสนอราคา' })).toBeVisible();
    // Status filter pills
    await expect(page.getByRole('button', { name: 'ฉบับร่าง' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'รับแล้ว' })).toBeVisible();
  });

  test('Sales Orders page renders with convert action', async ({ page }) => {
    await page.getByRole('link', { name: /Sales Orders/ }).click();
    await expect(page).toHaveURL(/\/sales-orders/);
    await expect(page.getByRole('heading', { name: 'Sales Orders' })).toBeVisible();
    await expect(page.getByRole('button', { name: /แปลงจากใบเสนอราคา/ })).toBeVisible();
  });

  test('Dashboard shows Sprint 2 stat cards', async ({ page }) => {
    await expect(page.getByText('ใบเสนอราคา').first()).toBeVisible();
    await expect(page.getByText('Sales Orders').first()).toBeVisible();
  });
});
