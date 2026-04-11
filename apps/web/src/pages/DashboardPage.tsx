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
          {isAdmin && (
            <StatCard label="ผู้ใช้ระบบ" value={users.data?.total ?? '—'} icon="manage_accounts" accent="bg-brand-navy" />
          )}
        </div>

        <div className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">After-Sales</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="เครื่องของลูกค้า" value={assets.data?.total ?? '—'} icon="inventory_2" accent="bg-brand-navy" />
          <StatCard label="PM ที่ถึงกำหนด (30 วัน)" value={pmUpcoming.data?.total ?? '—'} icon="build" accent="bg-status-warning" />
          <StatCard label="Service Tickets" value={tickets.data?.total ?? '—'} icon="confirmation_number" accent="bg-brand-red" />
        </div>
      </div>
    </>
  );
}
