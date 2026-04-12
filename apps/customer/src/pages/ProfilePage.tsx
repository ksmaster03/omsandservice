import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { logout } from '../lib/queries';

export default function ProfilePage() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();

  function doLogout() {
    logout();
    setMe(null);
    navigate('/login');
  }

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-8 rounded-b-[20px] mb-4 text-center">
        <div className="inline-flex w-20 h-20 rounded-full bg-brand-red items-center justify-center mb-3 font-display font-black text-2xl">
          {me?.customer.name?.[0] ?? '?'}
        </div>
        <div className="font-display font-black text-lg">{me?.customer.name}</div>
        <div className="text-[11px] text-white/60 mt-0.5">{me?.displayName}</div>
      </header>

      <div className="px-4 space-y-4">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 divide-y divide-gray-100">
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-500">เบอร์โทร</span>
            <span className="font-semibold">{me?.phone ?? '—'}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-500">อีเมล</span>
            <span className="font-semibold">{me?.customer.email ?? '—'}</span>
          </div>
          <div className="px-4 py-3 text-xs">
            <div className="text-gray-500 mb-1">ที่อยู่</div>
            <div className="font-semibold">{me?.customer.address ?? '—'}</div>
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="text-[11px] text-gray-500 mb-3">ติดต่อทีมขาย / บริการ</div>
          <a
            href="tel:021234567"
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-red text-white font-semibold rounded-brand"
          >
            <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">call</span>
            โทร Toptier
          </a>
        </div>

        <button
          onClick={doLogout}
          className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-brand bg-white"
        >
          ออกจากระบบ
        </button>

        <div className="text-[10px] text-gray-400 text-center">
          Toptier Customer PWA · v1.0.0
        </div>
      </div>
    </>
  );
}
