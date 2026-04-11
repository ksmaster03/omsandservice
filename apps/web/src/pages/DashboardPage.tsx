import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import {
  listCustomers,
  listProducts,
  listUsers,
  listQuotations,
  listSalesOrders,
} from '../lib/queries';
import { useAuth } from '../store/auth';

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-brand-lg border border-gray-200 p-5 shadow-brand-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
          <div className="font-display font-black text-3xl text-brand-navy leading-none">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-brand flex items-center justify-center ${accent} bg-opacity-10`}>
          <span className={`material-symbols-outlined ${accent.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const customers = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => listCustomers({ pageSize: 1 }),
  });
  const products = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => listProducts({ pageSize: 1 }),
  });
  const users = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: () => listUsers({ pageSize: 1 }),
    enabled: isAdmin,
  });
  const quotes = useQuery({
    queryKey: ['dashboard-quotes'],
    queryFn: () => listQuotations({ pageSize: 1 }),
  });
  const salesOrders = useQuery({
    queryKey: ['dashboard-sales-orders'],
    queryFn: () => listSalesOrders({ pageSize: 1 }),
  });

  return (
    <>
      <PageHeader title={`สวัสดี ${user?.name ?? ''}`} subtitle="ภาพรวมระบบ NBA Sport OMS" />
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="ลูกค้า"
            value={customers.data?.total ?? '—'}
            icon="groups"
            accent="bg-brand-red"
          />
          <StatCard
            label="สินค้า"
            value={products.data?.total ?? '—'}
            icon="fitness_center"
            accent="bg-brand-gold"
          />
          <StatCard
            label="ใบเสนอราคา"
            value={quotes.data?.total ?? '—'}
            icon="request_quote"
            accent="bg-status-info"
          />
          <StatCard
            label="Sales Orders"
            value={salesOrders.data?.total ?? '—'}
            icon="receipt_long"
            accent="bg-status-success"
          />
          {isAdmin ? (
            <StatCard
              label="ผู้ใช้ระบบ"
              value={users.data?.total ?? '—'}
              icon="manage_accounts"
              accent="bg-brand-navy"
            />
          ) : (
            <StatCard label="Sprint" value="2" icon="rocket_launch" accent="bg-brand-navy" />
          )}
        </div>

        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-6">
          <h2 className="font-display font-bold text-lg text-brand-navy mb-3">🚀 Sprint 2 เสร็จแล้ว — Sales Flow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-2">✅ ที่ทำเสร็จ</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Lead pipeline (5 stages + board view)</li>
                <li>Demo scheduler API</li>
                <li>Quotation builder พร้อม VAT + ส่วนลด + multi-item</li>
                <li>Quote → Sales Order conversion + milestone templates</li>
                <li>Payment milestone tracking (30/30/40, 50/50, FULL)</li>
                <li>Auto-number Q- / SO- ต่อเดือน</li>
                <li>Vitest 20 tests ใหม่ (full sales flow integration)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">🔜 Sprint 3 ถัดไป</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Install assignment + photo upload → S3</li>
                <li>Asset auto-generation จาก install completion</li>
                <li>Warranty tracking + alert ก่อนหมด</li>
                <li>PM schedule generator</li>
                <li>Service Ticket พื้นฐาน</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
