import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', section: 'ภาพรวม' },
  { to: '/leads', label: 'Sales Pipeline', icon: 'filter_alt', section: 'การขาย' },
  { to: '/demos', label: 'นัดหมาย Demo', icon: 'event', section: 'การขาย' },
  { to: '/quotations', label: 'ใบเสนอราคา', icon: 'request_quote', section: 'การขาย' },
  { to: '/sales-orders', label: 'Sales Orders', icon: 'receipt_long', section: 'การขาย' },
  { to: '/installations', label: 'การติดตั้ง', icon: 'local_shipping', section: 'After-Sales' },
  { to: '/assets', label: 'เครื่องลูกค้า', icon: 'inventory_2', section: 'After-Sales' },
  { to: '/pm-schedules', label: 'บำรุงรักษา PM', icon: 'build', section: 'After-Sales' },
  { to: '/tickets', label: 'Service Tickets', icon: 'confirmation_number', section: 'After-Sales' },
  { to: '/customers', label: 'ลูกค้า', icon: 'groups', section: 'Master Data' },
  { to: '/products', label: 'สินค้า', icon: 'fitness_center', section: 'Master Data' },
  { to: '/users', label: 'จัดการผู้ใช้', icon: 'manage_accounts', section: 'ระบบ', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const groupedNav = navItems
    .filter((item) => !item.adminOnly || isAdmin)
    .reduce<Record<string, typeof navItems>>((acc, item) => {
      (acc[item.section] ??= []).push(item);
      return acc;
    }, {});

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-brand-navy text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-brand-lg bg-brand-red flex items-center justify-center font-display font-black text-sm">
              NBA
            </div>
            <div>
              <div className="font-display font-black text-sm">NBA SPORT</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Order Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {Object.entries(groupedNav).map(([section, items]) => (
            <div key={section} className="mb-2">
              <div className="px-4 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {section}
              </div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 mx-2 px-3 py-2 rounded-brand text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-red text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                    }`
                  }
                >
                  <span className="material-symbols-outlined !text-[19px]" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] text-white/40">{user?.role}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
          >
            <span className="material-symbols-outlined !text-[19px]" aria-hidden="true">
              logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
