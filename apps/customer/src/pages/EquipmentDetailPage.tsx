import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getAsset, type WarrantyStatus } from '../lib/queries';

const warrantyLabel: Record<WarrantyStatus, string> = {
  active: 'ประกันปกติ',
  expiring: 'ใกล้หมด',
  expired: 'หมดอายุ',
};

const warrantyColor: Record<WarrantyStatus, string> = {
  active: 'bg-status-success text-white',
  expiring: 'bg-brand-gold text-brand-navy',
  expired: 'bg-brand-red text-white',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => getAsset(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-10 text-gray-400">กำลังโหลด...</div>;
  if (!data) return <div className="text-center py-10 text-gray-400">ไม่พบข้อมูล</div>;

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-5 rounded-b-[20px] mb-4">
        <Link to="/equipment" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <span className="material-symbols-outlined !text-sm" aria-hidden="true">chevron_left</span>
          กลับ
        </Link>
        <h1 className="font-display font-black text-xl mt-1">{data.product.name}</h1>
        <div className="text-[11px] text-white/60 font-mono">{data.serialNo}</div>
      </header>

      <div className="px-4 space-y-4">
        {/* Warranty card */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">ประกัน</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(data.warrantyEnd).toLocaleDateString('th-TH')}
              </div>
              <div className="text-xs text-gray-500">
                {data.warrantyDaysLeft > 0 ? `เหลืออีก ${data.warrantyDaysLeft} วัน` : `หมดแล้ว ${Math.abs(data.warrantyDaysLeft)} วัน`}
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${warrantyColor[data.warrantyStatus]}`}>
              {warrantyLabel[data.warrantyStatus]}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 divide-y divide-gray-100">
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-500">แบรนด์</span>
            <span className="font-semibold">{data.product.brand}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-500">SKU</span>
            <span className="font-mono">{data.product.sku}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs">
            <span className="text-gray-500">ติดตั้งเมื่อ</span>
            <span className="font-semibold">{new Date(data.installedAt).toLocaleDateString('th-TH')}</span>
          </div>
          {data.locationDetail && (
            <div className="px-4 py-3 flex justify-between text-xs">
              <span className="text-gray-500">ตำแหน่ง</span>
              <span className="font-semibold">{data.locationDetail}</span>
            </div>
          )}
          {data.nextPmDate && (
            <div className="px-4 py-3 flex justify-between text-xs">
              <span className="text-gray-500">PM ถัดไป</span>
              <span className="font-semibold">{new Date(data.nextPmDate).toLocaleDateString('th-TH')}</span>
            </div>
          )}
        </div>

        {/* PM history */}
        {data.pmSchedules.length > 0 && (
          <div>
            <div className="text-xs font-bold text-brand-navy mb-2">ประวัติ PM</div>
            <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 divide-y divide-gray-100">
              {data.pmSchedules.slice(0, 5).map((pm) => (
                <div key={pm.id} className="px-4 py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold">{new Date(pm.scheduledAt).toLocaleDateString('th-TH')}</div>
                    {pm.note && <div className="text-gray-500 text-[11px] mt-0.5">{pm.note}</div>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pm.status === 'COMPLETED' ? 'bg-status-success-light text-status-success' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pm.status === 'COMPLETED' ? '✓ เสร็จ' : pm.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket history */}
        {data.tickets.length > 0 && (
          <div>
            <div className="text-xs font-bold text-brand-navy mb-2">ประวัติแจ้งซ่อม</div>
            <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 divide-y divide-gray-100">
              {data.tickets.slice(0, 5).map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="block px-4 py-3 text-xs hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-gray-500">{t.ticketNo}</div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 mt-0.5">{t.problemType}</div>
                  <div className="text-[10px] text-gray-500">สถานะ: {t.stage}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
