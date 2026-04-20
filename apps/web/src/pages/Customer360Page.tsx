import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import api from '../lib/api';

interface Summary {
  totalAssets: number;
  activeWarranty: number;
  openTickets: number;
  totalRevenue: number;
  avgRating: number | null;
  pendingPm: number;
}

interface TimelineItem {
  date: string;
  type: string;
  title: string;
  detail?: string;
  status?: string;
  id: string;
}

const TYPE_ICON: Record<string, string> = {
  lead: 'filter_alt',
  quote: 'request_quote',
  so: 'receipt_long',
  install: 'local_shipping',
  ticket: 'confirmation_number',
  pm: 'build',
  renewal: 'autorenew',
  rma: 'assignment_return',
};

const TYPE_COLOR: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600',
  quote: 'bg-blue-50 text-blue-600',
  so: 'bg-indigo-50 text-indigo-600',
  install: 'bg-purple-50 text-purple-600',
  ticket: 'bg-orange-50 text-orange-600',
  pm: 'bg-yellow-50 text-yellow-700',
  renewal: 'bg-green-50 text-green-600',
  rma: 'bg-red-50 text-red-600',
};

const TYPE_LABEL: Record<string, string> = {
  lead: 'Lead',
  quote: 'Quote',
  so: 'Sales Order',
  install: 'Installation',
  ticket: 'Service Ticket',
  pm: 'PM',
  renewal: 'Renewal',
  rma: 'RMA',
};

export default function Customer360Page() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', id],
    queryFn: async () => {
      const res = await api.get(`/internal/customers/${id}/360`);
      return res.data.data as {
        customer: { id: string; name: string; type: string; phone: string | null; email: string | null; address: string | null; wmsCode: string | null };
        summary: Summary;
        timeline: TimelineItem[];
        assets: Array<{ id: string; serialNo: string; warrantyEnd: string; product: { name: string; sku: string; brand: string } }>;
      };
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-600">{t('common.loading')}</div>;
  if (!data) return <div className="p-8 text-center text-gray-600">{t('common.notFound')}</div>;

  const { customer, summary, timeline, assets } = data;

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle="Customer 360° View"
        action={
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Customer info + summary cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Info card */}
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-lg">
                {customer.name[0]}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{customer.name}</div>
                <div className="text-xs text-gray-700">{customer.type} {customer.wmsCode ? `· WMS: ${customer.wmsCode}` : ''}</div>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              {customer.phone && <div className="flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">call</span>{customer.phone}</div>}
              {customer.email && <div className="flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">mail</span>{customer.email}</div>}
              {customer.address && <div className="flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">location_on</span>{customer.address}</div>}
            </div>
          </div>

          {/* Stat cards */}
          <StatCard icon="fitness_center" label="เครื่อง" value={String(summary.totalAssets)} sub={`ประกัน ${summary.activeWarranty}`} color="text-brand-navy" />
          <StatCard icon="payments" label="รายได้รวม" value={`฿${summary.totalRevenue.toLocaleString()}`} sub={summary.avgRating ? `CSAT ${summary.avgRating}/5` : 'ยังไม่มี CSAT'} color="text-status-success" />
          <StatCard icon="confirmation_number" label="Ticket เปิดอยู่" value={String(summary.openTickets)} sub={`PM ค้าง ${summary.pendingPm}`} color={summary.openTickets > 0 ? 'text-brand-red' : 'text-gray-600'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <h3 className="font-display font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined !text-[18px]">timeline</span>
              Activity Timeline
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">ยังไม่มี activity</div>}
              {timeline.map((item, i) => (
                <div key={`${item.type}-${item.id}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${TYPE_COLOR[item.type] ?? 'bg-gray-100'}`}>
                      <span className="material-symbols-outlined !text-[16px]">{TYPE_ICON[item.type] ?? 'circle'}</span>
                    </div>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-900">{item.title}</div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        {new Date(item.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-700">{TYPE_LABEL[item.type]}</span>
                      {item.status && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{item.status}</span>
                      )}
                    </div>
                    {item.detail && <div className="text-[11px] text-gray-700 mt-0.5">{item.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assets */}
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <h3 className="font-display font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined !text-[18px]">inventory_2</span>
              เครื่อง ({assets.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {assets.map((a) => {
                const daysLeft = Math.ceil((new Date(a.warrantyEnd).getTime() - Date.now()) / (86400000));
                const warColor = daysLeft > 60 ? 'text-status-success' : daysLeft > 0 ? 'text-brand-gold-text' : 'text-brand-red';
                return (
                  <div key={a.id} className="border border-gray-200 rounded-brand p-2.5">
                    <div className="text-xs font-semibold text-gray-900">{a.product.name}</div>
                    <div className="text-[10px] text-gray-700 font-mono">{a.serialNo} · {a.product.brand}</div>
                    <div className={`text-[10px] font-semibold mt-1 ${warColor}`}>
                      {daysLeft > 0 ? `ประกันเหลือ ${daysLeft} วัน` : 'หมดประกัน'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined !text-[20px] ${color}`}>{icon}</span>
        <span className="text-xs text-gray-700">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-1">{sub}</div>
    </div>
  );
}
