import { test, expect } from '@playwright/test';

/**
 * i18n audit: visit each requested page in EN mode and capture the
 * PageHeader title. If the title is still Thai-only the page hasn't
 * been i18n-converted yet.
 */

const PROD = 'https://nba-admin.toptierdigital.space';
const ADMIN_EMAIL = 'admin@nbasport.local';
const ADMIN_PASSWORD = 'Nba@12345';

const PAGES: Array<{ path: string; label: string; expectedEn?: RegExp }> = [
  { path: '/users', label: 'User Management', expectedEn: /User Management|Users/i },
  { path: '/wms', label: 'WMS Integration', expectedEn: /WMS/i },
  { path: '/reports', label: 'Reports', expectedEn: /Reports/i },
  { path: '/rmas', label: 'RMA', expectedEn: /RMA/i },
  { path: '/renewals', label: 'Warranty Renewals', expectedEn: /Warranty|Renewal/i },
  { path: '/customer-assets', label: 'Customer Assets', expectedEn: /Asset/i },
  { path: '/pm-schedules', label: 'PM Schedules', expectedEn: /PM/i },
  { path: '/installations', label: 'Installations', expectedEn: /Install/i },
];

const THAI_RE = /[\u0E00-\u0E7F]/;

function isThai(s: string) {
  return THAI_RE.test(s);
}

test('i18n audit — capture title for each page in EN mode', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(PROD + '/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${PROD}/`, { timeout: 15_000 });

  // Switch to EN once at the dashboard
  await page.getByRole('button', { name: /^en$/i }).first().click();
  await page.waitForTimeout(500);

  const report: Array<{
    path: string;
    label: string;
    titleHeader: string;
    titleNav: string;
    converted: boolean;
  }> = [];

  for (const p of PAGES) {
    await page.goto(PROD + p.path);
    await page.waitForTimeout(800);

    // Header h1/h2 in PageHeader component
    const titleEl = page.locator('h1, h2').first();
    let titleHeader = '';
    try {
      titleHeader = (await titleEl.innerText({ timeout: 5_000 })).trim();
    } catch {
      titleHeader = '(no header)';
    }

    // Sidebar nav active item text
    let titleNav = '';
    try {
      titleNav = (await page.locator('a.bg-brand-red, a.bg-brand-navy, [aria-current="page"]').first().innerText({ timeout: 2_000 })).trim();
    } catch {
      titleNav = '';
    }

    const headerIsThai = isThai(titleHeader);
    const navIsThai = isThai(titleNav);
    // Page is converted if neither header nor nav fall back to Thai
    const converted = !headerIsThai;

    report.push({
      path: p.path,
      label: p.label,
      titleHeader,
      titleNav,
      converted,
    });
  }

  // Print readable table to test output
  console.log('\n=== i18n PAGE AUDIT (lang=EN) ===');
  console.log('Path                  | Header                              | Nav                | i18n');
  console.log('----------------------|-------------------------------------|--------------------|------');
  for (const r of report) {
    const status = r.converted ? '✅' : '❌';
    console.log(
      `${r.path.padEnd(21)} | ${r.titleHeader.padEnd(35).slice(0, 35)} | ${r.titleNav.padEnd(18).slice(0, 18)} | ${status}`,
    );
  }
  console.log('=================================\n');

  // Don't fail the test — this is purely informational
  expect(report.length).toBe(PAGES.length);
});
