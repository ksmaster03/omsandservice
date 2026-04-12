import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import {
  getReportsSummary,
  getReportsPipeline,
  getReportsSalesByBrand,
  getReportsTicketsByStage,
} from '../lib/queries';

const BRAND_LABEL: Record<string, string> = {
  MAXNUM: 'Maxnum',
  GORILLA_TECK: 'Gorilla Teck',
  ANYFIT: 'AnyFit',
  IMPULSE: 'Impulse',
};

const STAGE_LABEL: Record<string, string> = {
  LEAD: 'Lead ใหม่',
  QUALIFIED: 'คัดกรอง',
  DEMO: 'Demo',
  QUOTE: 'ใบเสนอราคา',
  NEGOTIATION: 'ต่อรอง',
  WON: 'ปิดการขาย',
  LOST: 'ยกเลิก',
};

const TICKET_STAGE_LABEL: Record<string, string> = {
  RECEIVED: 'รับแจ้ง',
  ASSIGNED: 'มอบหมาย',
  EN_ROUTE: 'เดินทาง',
  ARRIVED: 'ถึงหน้างาน',
  REPAIRING: 'กำลังซ่อม',
  CLOSED: 'ปิดงาน',
  CANCELLED: 'ยกเลิก',
};

function Kpi({ label, value, color = 'navy' }: { label: string; value: string | number; color?: string }) {
  const colorClass: Record<string, string> = {
    red: 'text-brand-red',
    navy: 'text-brand-navy',
    gold: 'text-brand-gold-text',
    green: 'text-status-success',
    info: 'text-status-info',
  };
  return (
    <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`font-display font-black text-2xl leading-none ${colorClass[color]}`}>{value}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 text-xs font-semibold text-gray-700 truncate">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-24 text-right text-xs font-mono text-gray-700">{value.toLocaleString()}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const summary = useQuery({ queryKey: ['reports', 'summary'], queryFn: getReportsSummary });
  const pipeline = useQuery({ queryKey: ['reports', 'pipeline'], queryFn: getReportsPipeline });
  const salesByBrand = useQuery({ queryKey: ['reports', 'sales-by-brand'], queryFn: getReportsSalesByBrand });
  const ticketsByStage = useQuery({ queryKey: ['reports', 'tickets-by-stage'], queryFn: getReportsTicketsByStage });

  const brandEntries = Object.entries(salesByBrand.data ?? {}).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxBrandRev = Math.max(0, ...brandEntries.map(([, v]) => v.revenue));

  const pipelineEntries = Object.entries(pipeline.data ?? {}).sort(
    (a, b) => b[1].totalValue - a[1].totalValue,
  );
  const maxPipelineVal = Math.max(0, ...pipelineEntries.map(([, v]) => v.totalValue));

  const ticketEntries = Object.entries(ticketsByStage.data ?? {});
  const maxTicketCount = Math.max(0, ...ticketEntries.map(([, v]) => v));

  return (
    <>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />

      <div className="p-6 space-y-6">
        {/* Sales KPI row */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">ยอดขาย</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi label="ลูกค้าทั้งหมด" value={summary.data?.sales.customers ?? '—'} />
            <Kpi label="Leads กำลังดำเนินการ" value={summary.data?.sales.activeLeads ?? '—'} color="info" />
            <Kpi label="Quotes เดือนนี้" value={summary.data?.sales.quotesThisMonth ?? '—'} color="gold" />
            <Kpi label="Sales Orders เดือนนี้" value={summary.data?.sales.soThisMonth ?? '—'} color="green" />
            <Kpi
              label="รายได้เดือนนี้"
              value={summary.data ? `฿${summary.data.sales.revenueThisMonth.toLocaleString()}` : '—'}
              color="red"
            />
          </div>
        </div>

        {/* After-sales KPI row */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">After-Sales</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi label="เครื่องทั้งหมด" value={summary.data?.operations.assetsTotal ?? '—'} />
            <Kpi label="Installs รอคิว" value={summary.data?.operations.installsPending ?? '—'} color="gold" />
            <Kpi label="Tickets ค้าง" value={summary.data?.afterSales.ticketsOpen ?? '—'} color="red" />
            <Kpi label="ประกันใกล้หมด 60 วัน" value={summary.data?.afterSales.warrantyExpiring60d ?? '—'} color="gold" />
            <Kpi label="PM ถึงกำหนด 60 วัน" value={summary.data?.afterSales.pmDueSoon60d ?? '—'} color="info" />
          </div>
        </div>

        {/* Bar charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-5">
            <div className="font-display font-bold text-sm text-brand-navy mb-4">Pipeline — มูลค่าตามสถานะ</div>
            {pipelineEntries.length === 0 && <div className="text-xs text-gray-400 text-center py-6">ยังไม่มี leads</div>}
            {pipelineEntries.map(([stage, v]) => (
              <BarRow
                key={stage}
                label={STAGE_LABEL[stage] ?? stage}
                value={v.totalValue}
                max={maxPipelineVal}
                color="bg-brand-red"
              />
            ))}
          </div>

          <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-5">
            <div className="font-display font-bold text-sm text-brand-navy mb-4">ยอดขายแยกตามแบรนด์</div>
            {brandEntries.length === 0 && <div className="text-xs text-gray-400 text-center py-6">ยังไม่มีการขาย</div>}
            {brandEntries.map(([brand, v]) => (
              <BarRow
                key={brand}
                label={BRAND_LABEL[brand] ?? brand}
                value={v.revenue}
                max={maxBrandRev}
                color="bg-brand-navy"
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-5">
          <div className="font-display font-bold text-sm text-brand-navy mb-4">Service Tickets ตามสถานะ</div>
          {ticketEntries.length === 0 && <div className="text-xs text-gray-400 text-center py-6">ยังไม่มี tickets</div>}
          {ticketEntries.map(([stage, count]) => (
            <BarRow
              key={stage}
              label={TICKET_STAGE_LABEL[stage] ?? stage}
              value={count}
              max={maxTicketCount}
              color="bg-status-info"
            />
          ))}
        </div>
      </div>
    </>
  );
}
