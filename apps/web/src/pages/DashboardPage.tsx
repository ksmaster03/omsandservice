import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PageHeader from '../components/PageHeader';
import api from '../lib/api';

const COLORS = ['#FF2720', '#FFCE00', '#0C1016', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => { const r = await api.get('/internal/reports/summary'); return r.data.data; },
  });
  const { data: pipeline } = useQuery({
    queryKey: ['reports-pipeline'],
    queryFn: async () => { const r = await api.get('/internal/reports/pipeline'); return r.data.data as Record<string, { count: number; totalValue: number }>; },
  });
  const { data: salesByBrand } = useQuery({
    queryKey: ['reports-sales-brand'],
    queryFn: async () => { const r = await api.get('/internal/reports/sales-by-brand'); return r.data.data as Record<string, { qty: number; revenue: number }>; },
  });
  const { data: pmCompliance } = useQuery({
    queryKey: ['reports-pm'],
    queryFn: async () => { const r = await api.get('/internal/reports/pm-compliance'); return r.data.data; },
  });
  const { data: salesKpis } = useQuery({
    queryKey: ['reports-sales-kpis'],
    queryFn: async () => { const r = await api.get('/internal/reports/sales-kpis'); return r.data.data; },
  });
  const { data: slaCompliance } = useQuery({
    queryKey: ['reports-sla'],
    queryFn: async () => { const r = await api.get('/internal/reports/sla-compliance'); return r.data.data; },
  });

  const pipelineData = pipeline ? Object.entries(pipeline).map(([stage, v]) => ({ stage, count: v.count, value: v.totalValue })) : [];
  const brandData = salesByBrand ? Object.entries(salesByBrand).map(([brand, v]) => ({ brand, qty: v.qty, revenue: v.revenue })) : [];

  return (
    <>
      <PageHeader title={t('dashboard.greeting')} subtitle={t('dashboard.subtitle')} />

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon="groups" label={t('dashboard.cardCustomers')} value={summary?.sales?.customers ?? '—'} color="text-brand-navy" />
          <KpiCard icon="fitness_center" label={t('dashboard.cardAssets')} value={summary?.operations?.assetsTotal ?? '—'} color="text-brand-red" />
          <KpiCard icon="confirmation_number" label={t('dashboard.cardTickets')} value={summary?.afterSales?.ticketsOpen ?? '—'} color="text-orange-500" />
          <KpiCard icon="build" label={t('dashboard.cardPmDue')} value={summary?.afterSales?.pmDueSoon60d ?? '—'} color="text-brand-gold-text" />
        </div>

        {/* KPI Cards Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon="trending_up" label="Win Rate" value={salesKpis ? `${salesKpis.winRate}%` : '—'} color="text-status-success" />
          <KpiCard icon="speed" label="Lead → Quote" value={salesKpis ? `${salesKpis.leadToQuote}%` : '—'} color="text-blue-500" />
          <KpiCard icon="verified" label="PM Compliance" value={pmCompliance ? `${pmCompliance.complianceRate}%` : '—'} color="text-purple-500" />
          <KpiCard icon="timer" label="SLA Compliance" value={slaCompliance ? `${slaCompliance.complianceRate}%` : '—'} color="text-status-success" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Sales Pipeline">
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pipelineData} layout="vertical">
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="stage" fontSize={11} width={90} />
                  <Tooltip formatter={(v) => `${v} leads`} />
                  <Bar dataKey="count" fill="#FF2720" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Revenue by Brand">
            {brandData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={brandData} dataKey="revenue" nameKey="brand" cx="50%" cy="50%" outerRadius={90} label fontSize={11}>
                    {brandData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `฿${Number(v).toLocaleString()}`} />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="PM Status">
            {pmCompliance ? (
              <div className="space-y-2">
                <ProgressBar label="Completed" value={pmCompliance.completed} max={pmCompliance.total} color="bg-status-success" />
                <ProgressBar label="Pending" value={pmCompliance.pending} max={pmCompliance.total} color="bg-brand-gold" />
                <ProgressBar label="Overdue" value={pmCompliance.overdue} max={pmCompliance.total} color="bg-brand-red" />
                <div className="text-center text-2xl font-bold text-brand-navy mt-2">{pmCompliance.complianceRate}%</div>
                <div className="text-center text-[10px] text-gray-600">Compliance Rate</div>
              </div>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="SLA Performance">
            {slaCompliance ? (
              <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-status-success">{slaCompliance.complianceRate}%</div>
                <div className="text-xs text-gray-700">On Time: {slaCompliance.onTime} · Breached: {slaCompliance.breached}</div>
                <div className="text-[10px] text-gray-600">Closed tickets: {slaCompliance.total}</div>
              </div>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Sales Conversion">
            {salesKpis ? (
              <div className="space-y-2">
                <ProgressBar label="Lead → Quote" value={salesKpis.leadToQuote} max={100} color="bg-blue-500" />
                <ProgressBar label="Quote → SO" value={salesKpis.quoteToSo} max={100} color="bg-indigo-500" />
                <ProgressBar label="Win Rate" value={salesKpis.winRate} max={100} color="bg-status-success" />
                <div className="text-xs text-gray-600 mt-2">
                  Leads: {salesKpis.totalLeads} · Quotes: {salesKpis.totalQuotes} · SOs: {salesKpis.totalSO}
                </div>
              </div>
            ) : <Empty />}
          </ChartCard>
        </div>
      </div>
    </>
  );
}

function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`material-symbols-outlined !text-[18px] ${color}`}>{icon}</span>
        <span className="text-[10px] sm:text-xs text-gray-700">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
      <h3 className="font-display font-bold text-sm text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-center py-8 text-gray-600 text-sm">No data yet</div>;
}
