import { useAuth } from '../store/auth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-lg">NBA Sport OMS</h1>
          <p className="text-[10px] text-white/60 uppercase tracking-wider">Order Management System</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-[10px] text-white/60">{user?.role}</div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-brand-red rounded hover:bg-brand-red-dark"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-6">
          <h2 className="font-display font-bold text-xl text-brand-navy mb-2">
            🎉 Sprint 0 สำเร็จ
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Monorepo, API, Prisma, JWT auth, และ React app พร้อมใช้งานแล้ว
          </p>
          <div className="bg-gray-50 rounded-brand p-4 text-xs font-mono text-gray-700">
            <div className="font-bold text-brand-navy mb-2">Next up (Sprint 1):</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Customer CRUD + import</li>
              <li>Product catalog + brand filter</li>
              <li>User management (Admin)</li>
              <li>Dashboard widgets</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
