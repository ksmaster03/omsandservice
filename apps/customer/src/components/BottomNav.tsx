import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'หน้าหลัก', icon: 'home' },
  { to: '/equipment', label: 'เครื่อง', icon: 'fitness_center' },
  { to: '/report', label: 'แจ้งซ่อม', icon: 'build', primary: true },
  { to: '/tickets', label: 'Ticket', icon: 'confirmation_number' },
  { to: '/profile', label: 'บัญชี', icon: 'person' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex items-end justify-around max-w-md mx-auto px-2 py-1.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-1 ${isActive ? 'text-brand-red' : 'text-gray-500'}`
            }
          >
            {({ isActive }) =>
              item.primary ? (
                <>
                  <div className="w-12 h-12 -mt-5 bg-brand-red text-white rounded-full flex items-center justify-center shadow-brand-lg">
                    <span className="material-symbols-outlined !text-2xl" aria-hidden="true">
                      {item.icon}
                    </span>
                  </div>
                  <span className="text-[10px] mt-0.5 font-semibold">{item.label}</span>
                </>
              ) : (
                <>
                  <span
                    className={`material-symbols-outlined !text-[22px] ${isActive ? 'text-brand-red' : 'text-gray-500'}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] mt-0.5 font-semibold">{item.label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
