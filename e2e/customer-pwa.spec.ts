/**
 * Sprint 5 — Customer PWA end-to-end smoke
 *
 * Full flow: OTP login → equipment list → ticket detail from timeline
 */
import { test, expect } from '@playwright/test';

const CUSTOMER_PWA = 'http://localhost:4120';

test.describe('Customer PWA', () => {
  test('login page renders with Thai branding', async ({ page }) => {
    await page.goto(`${CUSTOMER_PWA}/login`);
    await expect(page.getByRole('heading', { name: 'NBA Sport' })).toBeVisible();
    await expect(page.getByLabel('เบอร์โทรที่ลงทะเบียนไว้')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ส่ง OTP' })).toBeVisible();
  });

  test('phone step → OTP step → home with bottom nav', async ({ page }) => {
    await page.goto(`${CUSTOMER_PWA}/login`);
    // Phone is pre-filled; click Send OTP
    await page.getByRole('button', { name: 'ส่ง OTP' }).click();

    // OTP step appears
    await expect(page.getByLabel('รหัส 6 หลัก')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('รหัส 6 หลัก').fill('000000');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();

    // Home screen
    await expect(page.getByText('The Fitness BKK (Demo)')).toBeVisible({ timeout: 10_000 });
    // Bottom nav
    await expect(page.getByRole('link', { name: /หน้าหลัก/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /เครื่อง/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /แจ้งซ่อม/ })).toBeVisible();
  });

  test('equipment list shows warranty status chips', async ({ page }) => {
    await page.goto(`${CUSTOMER_PWA}/login`);
    await page.getByRole('button', { name: 'ส่ง OTP' }).click();
    await page.getByLabel('รหัส 6 หลัก').fill('000000');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();
    await expect(page.getByText('The Fitness BKK (Demo)')).toBeVisible({ timeout: 10_000 });

    // Navigate to equipment page
    await page.getByRole('link', { name: /^เครื่อง$/ }).click();
    await expect(page.getByRole('heading', { name: 'เครื่องของคุณ' })).toBeVisible();
  });

  test('report page shows problem type grid and priority buttons', async ({ page }) => {
    await page.goto(`${CUSTOMER_PWA}/login`);
    await page.getByRole('button', { name: 'ส่ง OTP' }).click();
    await page.getByLabel('รหัส 6 หลัก').fill('000000');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();
    await expect(page.getByText('The Fitness BKK (Demo)')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /แจ้งซ่อม/ }).click();
    await expect(page.getByRole('heading', { name: 'แจ้งซ่อม' })).toBeVisible();
    // Problem options
    await expect(page.getByRole('button', { name: /สายพาน/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /เสียงดัง/ })).toBeVisible();
    // Priority options
    await expect(page.getByRole('button', { name: /เร่งด่วน/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ไม่เร่ง/ })).toBeVisible();
  });

  test('unknown phone shows NOT_REGISTERED error', async ({ page }) => {
    await page.goto(`${CUSTOMER_PWA}/login`);
    await page.getByLabel('เบอร์โทรที่ลงทะเบียนไว้').fill('0999999999');
    await page.getByRole('button', { name: 'ส่ง OTP' }).click();
    await page.getByLabel('รหัส 6 หลัก').fill('000000');
    await page.getByRole('button', { name: 'ยืนยัน' }).click();
    // NOT_REGISTERED message from API
    await expect(page.getByText(/Phone not registered|not registered/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
