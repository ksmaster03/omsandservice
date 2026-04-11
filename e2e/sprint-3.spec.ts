import { test, expect } from '@playwright/test';

test.describe('Sprint 3 — After-sales pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Installations page renders list', async ({ page }) => {
    await page.getByRole('link', { name: /การติดตั้ง/ }).click();
    await expect(page).toHaveURL(/\/installations/);
    await expect(page.getByRole('heading', { name: 'การติดตั้ง' })).toBeVisible();
  });

  test('Assets page renders with warranty filter pills', async ({ page }) => {
    await page.getByRole('link', { name: /เครื่องลูกค้า/ }).click();
    await expect(page).toHaveURL(/\/assets/);
    await expect(page.getByRole('heading', { name: /เครื่องของลูกค้า/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ใช้งานได้' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ใกล้หมด' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'หมดอายุ' })).toBeVisible();
  });

  test('PM Schedule page renders with upcoming toggle', async ({ page }) => {
    await page.getByRole('link', { name: /บำรุงรักษา PM/ }).click();
    await expect(page).toHaveURL(/\/pm-schedules/);
    await expect(page.getByRole('heading', { name: /บำรุงรักษา/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ถึงกำหนดใน 30 วัน/ })).toBeVisible();
  });

  test('Service Tickets page renders with stage filters + create button', async ({ page }) => {
    await page.getByRole('link', { name: /Service Tickets/ }).click();
    await expect(page).toHaveURL(/\/tickets/);
    await expect(page.getByRole('heading', { name: 'Service Tickets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'แจ้งซ่อมใหม่' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'รับแจ้ง' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'กำลังซ่อม' })).toBeVisible();
  });

  test('Dashboard shows After-Sales section with stats', async ({ page }) => {
    // "After-Sales" text is gated by uppercase CSS transform — matches as content
    await expect(page.getByText('เครื่องของลูกค้า').first()).toBeVisible();
    await expect(page.getByText(/PM ที่ถึงกำหนด/).first()).toBeVisible();
  });
});
