/**
 * PDF export smoke test — hits /quotations/:id/pdf, verifies PDF bytes come back.
 * Does NOT deeply validate the PDF content (that would need pdf-parse), just that
 * puppeteer can launch and produce a valid PDF stream.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp, loginAs, authHeader } from '../test/helpers';
import { prisma } from '../lib/prisma';
import { renderQuoteHtml, closeBrowser } from '../lib/pdf';

let app: FastifyInstance;
let salesToken: string;
let quoteId: string;

beforeAll(async () => {
  app = await makeTestApp();
  salesToken = await loginAs(app, 'sales1@nbasport.local');

  const product = await prisma.product.findUnique({ where: { sku: 'MX-T9-PRO' } });
  if (!product) throw new Error('Seed product missing');

  // Create a real quote via the API so we have realistic data
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/quotations',
    headers: authHeader(salesToken),
    payload: {
      customerId: '00000000-0000-0000-0000-000000000001',
      items: [{ productId: product.id, qty: 2, unitPrice: 89000 }],
      vatRate: 7,
    },
  });
  quoteId = res.json().data.id;
});

afterAll(async () => {
  await prisma.quotationItem.deleteMany({ where: { quotationId: quoteId } });
  await prisma.quotation.delete({ where: { id: quoteId } });
  await closeBrowser();
  await app.close();
  await prisma.$disconnect();
});

describe('Quotation PDF generation', () => {
  it('renderQuoteHtml includes key fields', () => {
    const html = renderQuoteHtml({
      quoteNo: 'Q-TEST-0001',
      createdAt: new Date('2026-04-11'),
      validUntil: new Date('2026-05-11'),
      status: 'DRAFT',
      customer: { name: 'Demo Gym' },
      sales: { name: 'Sales One', email: 'sales@nba.local' },
      items: [
        { name: 'Treadmill', sku: 'MX-T9-PRO', qty: 1, unitPrice: 89000, discount: 0, lineTotal: 89000 },
      ],
      subtotal: 89000,
      discount: 0,
      vatRate: 7,
      vat: 6230,
      total: 95230,
    });
    expect(html).toContain('Q-TEST-0001');
    expect(html).toContain('Demo Gym');
    expect(html).toContain('Treadmill');
    expect(html).toContain('NBA SPORT');
  });

  it('escapes HTML in customer names', () => {
    const html = renderQuoteHtml({
      quoteNo: 'X',
      createdAt: new Date(),
      validUntil: new Date(),
      status: 'DRAFT',
      customer: { name: '<script>alert(1)</script>' },
      sales: { name: 'S', email: 's@x.com' },
      items: [{ name: 'P', sku: 'SKU', qty: 1, unitPrice: 1, discount: 0, lineTotal: 1 }],
      subtotal: 1,
      discount: 0,
      vatRate: 0,
      vat: 0,
      total: 1,
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('GET /quotations/:id/pdf returns a valid PDF stream', { timeout: 30_000 }, async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/internal/quotations/${quoteId}/pdf`,
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    // PDF magic header: %PDF-
    const body = res.rawPayload;
    expect(body.length).toBeGreaterThan(1000);
    expect(body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('returns 404 for unknown quote id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/internal/quotations/00000000-0000-0000-0000-999999999999/pdf',
      headers: authHeader(salesToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/internal/quotations/${quoteId}/pdf`,
    });
    expect(res.statusCode).toBe(401);
  });
});
