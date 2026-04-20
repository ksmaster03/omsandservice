import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAssets, type Asset, type WarrantyStatus } from '../lib/queries';

const warrantyLabel: Record<WarrantyStatus, string> = {
  active: 'ประกันปกติ',
  expiring: 'ใกล้หมด',
  expired: 'หมดอายุ',
};

const warrantyColor: Record<WarrantyStatus, string> = {
  active: 'bg-status-success-light text-status-success',
  expiring: 'bg-brand-gold-light text-brand-gold-text',
  expired: 'bg-brand-red-light text-brand-red',
};

export default function EquipmentPage() {
  const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: listAssets });

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-5 rounded-b-[20px] mb-4">
        <h1 className="font-display font-black text-xl">เครื่องของคุณ</h1>
        <div className="text-xs text-white/60 mt-0.5">{data?.length ?? '—'} รายการ</div>
      </header>

      <div className="px-4 space-y-3">
        {isLoading && <div className="text-center py-10 text-gray-600">กำลังโหลด...</div>}
        {!isLoading && data?.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">ยังไม่มีเครื่องในระบบ</div>
        )}
        {data?.map((a: Asset) => (
          <Link
            key={a.id}
            to={`/equipment/${a.id}`}
            className="block bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{a.product.name}</div>
                <div className="text-[11px] text-gray-700 font-mono">S/N: {a.serialNo}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${warrantyColor[a.warrantyStatus]}`}>
                {warrantyLabel[a.warrantyStatus]}
              </span>
            </div>
            {a.locationDetail && (
              <div className="text-[11px] text-gray-700 mb-2">📍 {a.locationDetail}</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-gray-600 bg-gray-50 rounded-brand p-2">
              <div>
                ติดตั้ง: <span className="font-semibold text-gray-900">{new Date(a.installedAt).toLocaleDateString('th-TH')}</span>
              </div>
              <div>
                ประกันถึง: <span className="font-semibold text-gray-900">{new Date(a.warrantyEnd).toLocaleDateString('th-TH')}</span>
              </div>
              <div className="col-span-2 mt-1 pt-1 border-t border-gray-200">
                เหลือ <strong className={a.warrantyDaysLeft < 60 ? 'text-brand-red' : 'text-gray-900'}>
                  {a.warrantyDaysLeft > 0 ? `${a.warrantyDaysLeft} วัน` : 'หมดแล้ว'}
                </strong>
                {a.nextPmDate && (
                  <span className="ml-2">
                    · PM ถัดไป: <strong>{new Date(a.nextPmDate).toLocaleDateString('th-TH')}</strong>
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
