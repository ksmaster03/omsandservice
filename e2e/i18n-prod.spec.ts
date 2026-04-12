import { test, expect } from '@playwright/test';

/**
 * Smoke test against PROD admin: verify that switching language
 * (TH ↔ EN) actually translates pages, not just the menu.
 *
 * Standalone — uses prod URL, not the local dev server, and ignores
 * the project baseURL via per-test page.goto absolute URLs.
 */

const PROD = 'https://nba-admin.toptierdigital.space';
const ADMIN_EMAIL = 'admin@nbasport.local';
const ADMIN_PASSWORD = 'Nba@12345';

test.describe('prod i18n smoke', () => {
  test.use({ baseURL: PROD });

  test('login + switch EN, verify converted pages translate', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto(PROD + '/login');

    // Wait for login form, sign in
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${PROD}/`, { timeout: 15_000 });

    // Default language should be Thai — assert Thai before switching
    // Visit Customers page (one of the converted ones)
    await page.goto(PROD + '/customers');
    await expect(page.locator('h1, h2').filter({ hasText: 'ลูกค้า' }).first()).toBeVisible({ timeout: 10_000 });

    // Locate the EN button in the language switcher and click it
    const enButton = page.getByRole('button', { name: /^en$/i }).first();
    await enButton.click();

    // After switching, the Customers page header should now read "Customers"
    await expect(page.locator('h1, h2').filter({ hasText: /^Customers$/ }).first()).toBeVisible({ timeout: 5_000 });

    // Verify a column header switched too
    await expect(page.getByRole('cell', { name: 'Name', exact: true }).or(page.locator('th').filter({ hasText: 'Name' }))).toBeVisible({ timeout: 5_000 });

    // Visit Products and confirm
    await page.goto(PROD + '/products');
    await expect(page.locator('h1, h2').filter({ hasText: /^Products$/ }).first()).toBeVisible({ timeout: 10_000 });

    // Visit Service Tickets
    await page.goto(PROD + '/tickets');
    await expect(page.locator('h1, h2').filter({ hasText: /Service Tickets/i }).first()).toBeVisible({ timeout: 10_000 });

    // Visit RMA
    await page.goto(PROD + '/rmas');
    await expect(page.locator('h1, h2').filter({ hasText: /RMA/i }).first()).toBeVisible({ timeout: 10_000 });

    // Switch back to TH
    const thButton = page.getByRole('button', { name: /^th$/i }).first();
    await thButton.click();

    // Customers page should be Thai again
    await page.goto(PROD + '/customers');
    await expect(page.locator('h1, h2').filter({ hasText: 'ลูกค้า' }).first()).toBeVisible({ timeout: 5_000 });
  });
});
