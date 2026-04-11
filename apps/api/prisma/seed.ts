/**
 * Dev seed script — creates initial users, products, and sample customer
 * Run: pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Nba@12345';

const settingsSeed: Array<[string, string]> = [
  ['gps_interval_seconds', '30'],
  ['gps_tracking_expiry_minutes', '5'],
  ['ticket_sla_urgent_hours', '4'],
  ['ticket_sla_normal_hours', '24'],
  ['ticket_sla_low_hours', '72'],
  ['photo_max_count', '5'],
  ['photo_max_size_mb', '20'],
  ['video_max_count', '1'],
  ['video_max_size_mb', '50'],
  ['pm_reminder_days_before', '7'],
  ['warranty_reminder_days', '60,30,7'],
  ['quote_validity_days', '30'],
];

async function main() {
  console.info('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ─── Settings ───
  for (const [key, value] of settingsSeed) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.info(`  ✅ Settings: ${settingsSeed.length} keys`);

  // ─── Users ───
  const users = [
    { email: 'admin@nbasport.local', name: 'Admin Master', role: 'ADMIN' as const, phone: '0800000001' },
    { email: 'sales1@nbasport.local', name: 'Sales One', role: 'SALES' as const, phone: '0800000002' },
    { email: 'sales2@nbasport.local', name: 'Sales Two', role: 'SALES' as const, phone: '0800000003' },
    { email: 'install1@nbasport.local', name: 'Install Tech A', role: 'INSTALL' as const, phone: '0800000004' },
    { email: 'install2@nbasport.local', name: 'Install Tech B', role: 'INSTALL' as const, phone: '0800000005' },
    { email: 'service1@nbasport.local', name: 'Somsak Servicemen', role: 'SERVICE' as const, phone: '0800000006' },
    { email: 'service2@nbasport.local', name: 'Service Tech Two', role: 'SERVICE' as const, phone: '0800000007' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.info(`  ✅ Users: ${users.length} (password: ${DEFAULT_PASSWORD})`);

  // ─── Products ───
  const products = [
    { sku: 'MX-T9-PRO', brand: 'MAXNUM' as const, name: 'Maxnum T9 Pro Treadmill', category: 'Treadmill', price: 89000, warrantyMonths: 24, pmIntervalMonths: 3 },
    { sku: 'MX-E7', brand: 'MAXNUM' as const, name: 'Maxnum E7 Elliptical', category: 'Elliptical', price: 65000, warrantyMonths: 24, pmIntervalMonths: 4 },
    { sku: 'AF-X3', brand: 'ANYFIT' as const, name: 'AnyFit Bike X3', category: 'Bike', price: 42000, warrantyMonths: 24, pmIntervalMonths: 6 },
    { sku: 'GR-GFORCE', brand: 'GORILLA_TECK' as const, name: 'Gorilla G-Force', category: 'Strength', price: 120000, warrantyMonths: 36, pmIntervalMonths: 6 },
    { sku: 'IMP-ROW-X', brand: 'IMPULSE' as const, name: 'Impulse Rower X', category: 'Rower', price: 55000, warrantyMonths: 24, pmIntervalMonths: 4 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }
  console.info(`  ✅ Products: ${products.length}`);

  // ─── Sample Customer ───
  const customer = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      phone: '0891234567', // Customer PWA login uses this — mobile format, not office line
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'The Fitness BKK (Demo)',
      taxId: '0105550000000',
      type: 'CORPORATE',
      contactName: 'คุณสมชาย',
      phone: '0891234567',
      email: 'contact@thefitness.demo',
      address: '999 ถ.สุขุมวิท กรุงเทพฯ 10110',
      lat: 13.7442,
      lng: 100.5413,
    },
  });
  console.info(`  ✅ Sample customer: ${customer.name}`);

  // ─── Customer PWA user (auto-created on first login, seed for convenience) ───
  const cu = await prisma.customerUser.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      customerId: customer.id,
      phone: '0891234567',
      email: 'contact@thefitness.demo',
      displayName: 'คุณสมชาย (The Fitness BKK)',
    },
  });
  console.info(`  ✅ Customer PWA user: ${cu.phone} (DEV OTP: 000000)`);

  console.info('✨ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
