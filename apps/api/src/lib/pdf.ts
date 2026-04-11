/**
 * Quotation PDF generator (Puppeteer).
 *
 * Keeps a single browser instance warm across requests — launching Chrome
 * per-PDF takes ~1s which kills throughput. On shutdown the instance is
 * closed via the graceful handler in server.ts.
 *
 * NOTE for production: puppeteer bundles its own Chrome binary (~150MB)
 * which is fine on dev but tight on t3.micro free tier. Before deploy,
 * either switch to @sparticuz/chromium or install chromium system-wide
 * on the EC2 instance and use puppeteer-core + executablePath.
 */
import puppeteer, { type Browser } from 'puppeteer';

let cachedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) return cachedBrowser;
  cachedBrowser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return cachedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (cachedBrowser) {
    await cachedBrowser.close();
    cachedBrowser = null;
  }
}

interface QuoteLineInput {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface QuotePdfInput {
  quoteNo: string;
  createdAt: Date;
  validUntil: Date;
  status: string;
  customer: {
    name: string;
    taxId?: string | null;
    address?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  sales: { name: string; email: string };
  items: QuoteLineInput[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vat: number;
  total: number;
}

function fmtTHB(n: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** Build the HTML the PDF renderer will rasterise. Styled with NBA Sport brand. */
export function renderQuoteHtml(q: QuotePdfInput): string {
  const rows = q.items
    .map(
      (it, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <div class="item-name">${escapeHtml(it.name)}</div>
            <div class="item-sku">${escapeHtml(it.sku)}</div>
          </td>
          <td class="num">${it.qty}</td>
          <td class="num">${fmtTHB(it.unitPrice)}</td>
          <td class="num">${it.discount > 0 ? '−' + fmtTHB(it.discount) : '–'}</td>
          <td class="num tot">${fmtTHB(it.lineTotal)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${q.quoteNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Barlow:wght@700;800;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Sarabun', system-ui, sans-serif;
    font-size: 10.5pt;
    color: #212529;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 3px solid #FF2720;
    margin-bottom: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-badge {
    width: 54px; height: 54px;
    background: #0C1016;
    color: #FF2720;
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px;
    font-family: 'Barlow', sans-serif;
    font-weight: 900; font-size: 18pt;
    letter-spacing: -0.5px;
  }
  .brand-meta .name {
    font-family: 'Barlow', sans-serif;
    font-weight: 900; font-size: 16pt;
    color: #0C1016;
    letter-spacing: 0.3px;
  }
  .brand-meta .tagline {
    font-size: 8pt;
    color: #6C757D;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 1px;
  }
  .doc-title {
    text-align: right;
  }
  .doc-title h1 {
    font-family: 'Barlow', sans-serif;
    font-size: 22pt;
    color: #0C1016;
    font-weight: 900;
    letter-spacing: 0.5px;
  }
  .doc-title .no {
    font-family: 'Barlow', sans-serif;
    font-size: 11pt;
    color: #FF2720;
    font-weight: 700;
    margin-top: 2px;
  }
  .doc-title .dates {
    font-size: 8.5pt;
    color: #495057;
    margin-top: 6px;
  }
  .status-chip {
    display: inline-block;
    background: #FFF6CC;
    color: #A87800;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
  .info-grid {
    display: flex;
    gap: 16px;
    margin-bottom: 18px;
  }
  .info-box {
    flex: 1;
    background: #F8F9FA;
    border: 1px solid #E9ECEF;
    border-radius: 8px;
    padding: 10px 14px;
  }
  .info-box h3 {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #6C757D;
    margin-bottom: 4px;
    font-weight: 700;
  }
  .info-box .main {
    font-size: 11pt;
    font-weight: 700;
    color: #0C1016;
    margin-bottom: 2px;
  }
  .info-box .sub {
    font-size: 8.5pt;
    color: #495057;
    line-height: 1.45;
  }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
  }
  table.items thead th {
    background: #0C1016;
    color: #FFF;
    font-weight: 700;
    font-size: 8.5pt;
    padding: 8px 10px;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  table.items thead th.num { text-align: right; }
  table.items tbody td {
    padding: 10px;
    border-bottom: 1px solid #E9ECEF;
    vertical-align: top;
  }
  table.items tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.items tbody td.tot { font-weight: 700; color: #0C1016; }
  .item-name { font-weight: 600; }
  .item-sku { font-size: 8pt; color: #6C757D; font-family: monospace; }
  .totals {
    width: 42%;
    margin-left: auto;
    margin-bottom: 18px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 10pt;
  }
  .totals .row.sub { color: #495057; }
  .totals .row.grand {
    border-top: 2px solid #0C1016;
    padding-top: 8px;
    margin-top: 4px;
    font-weight: 700;
    font-size: 13pt;
    color: #0C1016;
  }
  .totals .row.grand .amount { color: #FF2720; }
  .terms {
    background: #FFF6CC;
    border-left: 3px solid #FFCE00;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    font-size: 8.5pt;
    color: #495057;
    margin-bottom: 14px;
  }
  .terms strong { color: #0C1016; }
  .footer {
    border-top: 1px solid #E9ECEF;
    padding-top: 10px;
    font-size: 8pt;
    color: #6C757D;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <div class="logo-badge">NBA</div>
      <div class="brand-meta">
        <div class="name">NBA SPORT</div>
        <div class="tagline">Fitness Equipment Thailand</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>ใบเสนอราคา</h1>
      <div class="no">${q.quoteNo}</div>
      <div class="dates">
        ออกวันที่ ${fmtDate(q.createdAt)}<br>
        ใช้ได้ถึง ${fmtDate(q.validUntil)}
      </div>
      <div class="status-chip">${escapeHtml(q.status)}</div>
    </div>
  </header>

  <section class="info-grid">
    <div class="info-box">
      <h3>เสนอให้</h3>
      <div class="main">${escapeHtml(q.customer.name)}</div>
      <div class="sub">
        ${q.customer.taxId ? `เลขผู้เสียภาษี: ${escapeHtml(q.customer.taxId)}<br>` : ''}
        ${q.customer.address ? `${escapeHtml(q.customer.address)}<br>` : ''}
        ${q.customer.contactName ? `ติดต่อ: ${escapeHtml(q.customer.contactName)} ` : ''}
        ${q.customer.phone ? `• ${escapeHtml(q.customer.phone)}` : ''}
      </div>
    </div>
    <div class="info-box">
      <h3>ผู้เสนอ</h3>
      <div class="main">${escapeHtml(q.sales.name)}</div>
      <div class="sub">
        ${escapeHtml(q.sales.email)}<br>
        NBA Sport Thailand
      </div>
    </div>
  </section>

  <table class="items">
    <thead>
      <tr>
        <th style="width: 4%">#</th>
        <th style="width: 42%">รายการ</th>
        <th class="num" style="width: 10%">จำนวน</th>
        <th class="num" style="width: 14%">ราคา/หน่วย</th>
        <th class="num" style="width: 14%">ส่วนลด</th>
        <th class="num" style="width: 16%">รวม</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row sub"><span>ยอดรวมก่อนส่วนลด</span><span>฿${fmtTHB(q.subtotal)}</span></div>
    ${q.discount > 0 ? `<div class="row sub"><span>ส่วนลดเพิ่มเติม</span><span>−฿${fmtTHB(q.discount)}</span></div>` : ''}
    <div class="row sub"><span>VAT ${q.vatRate}%</span><span>฿${fmtTHB(q.vat)}</span></div>
    <div class="row grand"><span>ยอดสุทธิ</span><span class="amount">฿${fmtTHB(q.total)}</span></div>
  </div>

  <div class="terms">
    <strong>เงื่อนไข:</strong> ใบเสนอราคานี้มีอายุ ${Math.ceil((q.validUntil.getTime() - q.createdAt.getTime()) / 86400000)} วัน
    นับจากวันที่ออก • ราคารวม VAT 7% • ยืนยันคำสั่งซื้อกับทีมขายก่อนการชำระเงินล่วงหน้า
  </div>

  <footer class="footer">
    <div>NBA Sport Thailand • nbasport.co.th</div>
    <div>เอกสารนี้สร้างจากระบบ OMS เมื่อ ${fmtDate(new Date())}</div>
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderQuotePdf(q: QuotePdfInput): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = renderQuoteHtml(q);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
