/**
 * Capture screenshots of every page in all 3 apps (production URLs).
 *
 * Run: pnpm exec tsx scripts/screenshot-all.ts
 * Output: screenshots/YYYY-MM-DD/*.png
 */
import { chromium, type Page, type BrowserContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OMS = 'https://nba-admin.toptierdigital.space';
const CUSTOMER = 'https://nba-app.toptierdigital.space';
const TECH = 'https://nba-tech.toptierdigital.space';

const OUT_DIR = path.resolve(
  process.cwd(),
  'screenshots',
  new Date().toISOString().slice(0, 10),
);

async function shot(page: Page, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.info(`  📸 ${name}`);
}

async function omsAdminFlow(ctx: BrowserContext) {
  console.info('\n=== OMS Admin ===');
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Login page
  await page.goto(`${OMS}/login`);
  await page.waitForLoadState('networkidle');
  await shot(page, '01-oms-login');

  // Fill + submit
  await page.getByLabel('อีเมล').fill('admin@nbasport.local');
  await page.getByLabel('รหัสผ่าน').fill('Nba@12345');
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
  await page.waitForURL(OMS + '/');
  await page.waitForLoadState('networkidle');
  await shot(page, '02-oms-dashboard');

  // Each page via sidebar nav
  const routes = [
    { path: '/leads', name: '03-oms-leads-pipeline' },
    { path: '/demos', name: '04-oms-demos-calendar' },
    { path: '/quotations', name: '05-oms-quotations' },
    { path: '/sales-orders', name: '06-oms-sales-orders' },
    { path: '/installations', name: '07-oms-installations' },
    { path: '/assets', name: '08-oms-assets' },
    { path: '/pm-schedules', name: '09-oms-pm-schedules' },
    { path: '/tickets', name: '10-oms-tickets' },
    { path: '/renewals', name: '11-oms-warranty-renewals' },
    { path: '/reports', name: '12-oms-reports' },
    { path: '/wms', name: '13-oms-wms-integration' },
    { path: '/customers', name: '14-oms-customers' },
    { path: '/products', name: '15-oms-products' },
    { path: '/users', name: '16-oms-users' },
  ];

  for (const r of routes) {
    await page.goto(`${OMS}${r.path}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // let animations settle
    await shot(page, r.name);
  }

  await page.close();
}

async function customerPwaFlow(ctx: BrowserContext) {
  console.info('\n=== Customer PWA ===');
  const page = await ctx.newPage();
  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });

  // Login (phone step)
  await page.goto(`${CUSTOMER}/login`);
  await page.waitForLoadState('networkidle');
  await shot(page, '20-customer-login-phone');

  // Enter phone → OTP step
  await page.getByLabel('เบอร์โทรที่ลงทะเบียนไว้').fill('0891234567');
  await page.getByRole('button', { name: /ส่ง OTP/ }).click();
  await page.waitForTimeout(1000);
  await shot(page, '21-customer-login-otp');

  // Enter OTP → home
  await page.getByLabel('รหัส 6 หลัก').fill('000000');
  await page.getByRole('button', { name: /ยืนยัน/ }).click();
  await page.waitForURL(CUSTOMER + '/');
  await page.waitForLoadState('networkidle');
  await shot(page, '22-customer-home');

  // Equipment list
  await page.goto(`${CUSTOMER}/equipment`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await shot(page, '23-customer-equipment-list');

  // Report (แจ้งซ่อม)
  await page.goto(`${CUSTOMER}/report`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await shot(page, '24-customer-report-ticket');

  // Tickets list
  await page.goto(`${CUSTOMER}/tickets`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await shot(page, '25-customer-tickets-list');

  // Profile
  await page.goto(`${CUSTOMER}/profile`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await shot(page, '26-customer-profile');

  await page.close();
}

async function techPwaFlow(ctx: BrowserContext) {
  console.info('\n=== Tech PWA ===');
  const page = await ctx.newPage();
  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });

  // Login
  await page.goto(`${TECH}/login`);
  await page.waitForLoadState('networkidle');
  await shot(page, '30-tech-login');

  // Fill + submit
  await page.getByLabel('อีเมล').fill('service1@nbasport.local');
  await page.getByLabel('รหัสผ่าน').fill('Nba@12345');
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click();
  await page.waitForURL(TECH + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await shot(page, '31-tech-home-my-tickets');

  await page.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.info(`Output: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ locale: 'th-TH' });

    await omsAdminFlow(ctx);
    await customerPwaFlow(ctx);
    await techPwaFlow(ctx);

    await ctx.close();
  } finally {
    await browser.close();
  }
  console.info(`\n✅ Done — screenshots in ${OUT_DIR}`);
}

void main();
