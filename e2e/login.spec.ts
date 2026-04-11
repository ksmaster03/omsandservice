import { test, expect } from '@playwright/test';

test.describe('OMS login flow', () => {
  test('login page renders with brand elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/NBA Sport OMS/);
    await expect(page.getByRole('heading', { name: 'NBA Sport OMS' })).toBeVisible();
    await expect(page.getByRole('button', { name: /เข้าสู่ระบบ/ })).toBeVisible();
  });

  test('successful login navigates to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Form is pre-filled with seed credentials in Sprint 0
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();

    // Dashboard appears after successful login
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });
    // Sidebar shows user info (heading uses different text already verified above)
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  test('sidebar navigates to customers and products', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('link', { name: /ลูกค้า/ }).click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByRole('heading', { name: 'ลูกค้า' })).toBeVisible();

    await page.getByRole('link', { name: /สินค้า/ }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole('heading', { name: 'สินค้า' })).toBeVisible();
    // Brand filter pills visible
    await expect(page.getByRole('button', { name: /Maxnum/ })).toBeVisible();
  });

  test('admin can access users page, sales cannot', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('link', { name: /จัดการผู้ใช้/ }).click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole('heading', { name: 'จัดการผู้ใช้' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('อีเมล').fill('admin@nbasport.local');
    await page.getByLabel('รหัสผ่าน').fill('wrongpass');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();

    await expect(page.getByText(/Invalid email or password/)).toBeVisible({ timeout: 5000 });
  });

  test('logout returns to login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
    await expect(page.getByRole('heading', { name: /สวัสดี Admin Master/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to / redirects to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
