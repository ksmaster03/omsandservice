import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { logout } from '../lib/queries';
import api from '../lib/api';

const DEFAULT_SUPPORT_PHONE = '021234567';

async function fetchSupportPhone(): Promise<string> {
  try {
    const res = await api.get<{ data?: { value?: string } }>('/public/settings/support_phone');
    return res.data?.data?.value ?? DEFAULT_SUPPORT_PHONE;
  } catch {
    return DEFAULT_SUPPORT_PHONE;
  }
}

export default function ProfilePage() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const { data: supportPhone = DEFAULT_SUPPORT_PHONE } = useQuery({
    queryKey: ['setting', 'support_phone'],
    queryFn: fetchSupportPhone,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

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
            <span className="text-gray-700">เบอร์โทร</span>
            <span className="font-semibold">{me?.phone ?? '—'}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-700">อีเมล</span>
            <span className="font-semibold">{me?.customer.email ?? '—'}</span>
          </div>
          <div className="px-4 py-3 text-xs">
            <div className="text-gray-700 mb-1">ที่อยู่</div>
            <div className="font-semibold">{me?.customer.address ?? '—'}</div>
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="text-[11px] text-gray-600 mb-3">ติดต่อทีมขาย / บริการ</div>
          <a
            href={`tel:${supportPhone}`}
            aria-label={`โทร Toptier ${supportPhone}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-red text-white font-semibold rounded-brand min-h-[48px]"
          >
            <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">call</span>
            โทร Toptier
          </a>
        </div>

        <button
          onClick={doLogout}
          className="w-full py-3 min-h-[48px] border border-gray-300 text-gray-700 font-semibold rounded-brand bg-white"
        >
          ออกจากระบบ
        </button>

        <div className="text-[10px] text-gray-600 text-center">
          Toptier Customer PWA · v1.0.0
        </div>
      </div>
    </>
  );
}
