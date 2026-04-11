import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import { listCustomers, listProducts, listUsers } from '../lib/queries';
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

  return (
    <>
      <PageHeader title={`สวัสดี ${user?.name ?? ''}`} subtitle="ภาพรวมระบบ NBA Sport OMS" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="ลูกค้าทั้งหมด"
            value={customers.data?.total ?? '—'}
            icon="groups"
            accent="bg-brand-red"
          />
          <StatCard
            label="สินค้าในระบบ"
            value={products.data?.total ?? '—'}
            icon="fitness_center"
            accent="bg-brand-gold"
          />
          {isAdmin && (
            <StatCard
              label="ผู้ใช้ระบบ"
              value={users.data?.total ?? '—'}
              icon="manage_accounts"
              accent="bg-brand-navy"
            />
          )}
          <StatCard label="Sprint ปัจจุบัน" value="1" icon="rocket_launch" accent="bg-status-success" />
        </div>

        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm p-6">
          <h2 className="font-display font-bold text-lg text-brand-navy mb-3">🚀 Sprint 1 เสร็จแล้ว</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-2">✅ ที่ทำเสร็จ</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Customer CRUD + ค้นหา + filter ประเภท</li>
                <li>Product catalog + brand filter + pagination</li>
                <li>User management (Admin-only)</li>
                <li>RBAC middleware + role guards</li>
                <li>Pagination utility + shared schemas</li>
                <li>Vitest 28 tests ใหม่สำหรับ routes</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">🔜 Sprint 2 ถัดไป</div>
              <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
                <li>Lead / Sales Pipeline (drag-drop board)</li>
                <li>Demo scheduler</li>
                <li>Quotation builder + PDF export</li>
                <li>Sales Order จาก Quote (convert)</li>
                <li>Payment milestone generator</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
