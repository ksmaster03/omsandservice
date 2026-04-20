import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();

  const items = [
    { to: '/', label: t('nav.home'), icon: 'home' },
    { to: '/equipment', label: t('nav.equipment'), icon: 'fitness_center' },
    { to: '/report', label: t('nav.report'), icon: 'build', primary: true },
    { to: '/tickets', label: t('nav.tickets'), icon: 'confirmation_number' },
    { to: '/renewals', label: t('nav.home') === 'Home' ? 'Warranty' : 'ประกัน', icon: 'verified' },
    { to: '/profile', label: t('nav.profile'), icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex items-end justify-around max-w-md mx-auto px-2 py-1.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-2 min-h-[48px] justify-end ${isActive ? 'text-brand-red' : 'text-gray-600'}`
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
                    className={`material-symbols-outlined !text-[22px] ${isActive ? 'text-brand-red' : 'text-gray-600'}`}
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
