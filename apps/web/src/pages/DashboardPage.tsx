import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import {
  listCustomers,
  listProducts,
  listUsers,
  listQuotations,
  listSalesOrders,
  listAssets,
  listPmSchedules,
  listTickets,
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
  const assets = useQuery({
    queryKey: ['dashboard-assets'],
    queryFn: () => listAssets({ pageSize: 1 }),
  });
  const pmUpcoming = useQuery({
    queryKey: ['dashboard-pm-upcoming'],
    queryFn: () => listPmSchedules({ upcoming: true, pageSize: 1 }),
  });
  const tickets = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: () => listTickets({ pageSize: 1 }),
  });

  return (
    <>
      <PageHeader title={`สวัสดี ${user?.name ?? ''}`} subtitle="ภาพรวมระบบ NBA Sport OMS" />
      <div className="p-6">
        <div className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Master + Sales</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="ลูกค้า" value={customers.data?.total ?? '—'} icon="groups" accent="bg-brand-red" />
          <StatCard label="สินค้า" value={products.data?.total ?? '—'} icon="fitness_center" accent="bg-brand-gold" />
          <StatCard label="ใบเสนอราคา" value={quotes.data?.total ?? '—'} icon="request_quote" accent="bg-status-info" />
          <StatCard label="Sales Orders" value={salesOrders.data?.total ?? '—'} icon="receipt_long" accent="bg-status-success" />
          {isAdmin ? (
            <StatCard label="ผู้ใช้ระบบ" value={users.data?.total ?? '—'} icon="manage_accounts" accent="bg-brand-navy" />
          ) : (
            <StatCard label="Sprint" value="3" icon="rocket_launch" accent="bg-brand-navy" />
          )}
        </div>

        <div className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">After-Sales</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="เครื่องของลูกค้า" value={assets.data?.total ?? '—'} icon="inventory_2" accent="bg-brand-navy" />
          <StatCard label="PM ที่ถึงกำหนด (30 วัน)" value={pmUpcoming.data?.total ?? '—'} icon="build" accent="bg-status-warning" />
          <StatCard label="Service Tickets" value={tickets.data?.total ?? '—'} icon="confirmation_number" accent="bg-brand-red" />
        </div>

        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-6">
          <h2 className="font-display font-bold text-lg text-brand-navy mb-3">🚀 Sprint 3 เสร็จแล้ว — After-Sales Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-2">✅ ที่ทำเสร็จ</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Installation flow (schedule → assign → complete → auto Asset)</li>
                <li>Photo upload (local FS now, S3-ready interface)</li>
                <li>Asset registry + computed warranty status (active/expiring/expired)</li>
                <li>PM schedule auto-generator (รอบถัดไปเมื่อปิดงาน)</li>
                <li>Service Ticket + timeline events + SLA due</li>
                <li>Auto-number T- ต่อเดือน</li>
                <li>Vitest 18 tests ใหม่ (full after-sales flow integration)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">🔜 Sprint 4 ถัดไป</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Warranty renewal workflow (offer/accept/paid)</li>
                <li>WMS integration (mock → real spec)</li>
                <li>LINE OA chat + push notifications</li>
                <li>Customer PWA wired to real APIs</li>
                <li>Tech PWA GPS tracking</li>
                <li>Reports + dashboard metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
