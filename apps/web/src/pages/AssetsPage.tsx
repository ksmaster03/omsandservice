import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import { listAssets, type Asset } from '../lib/queries';

const warrantyPill: Record<Asset['warrantyStatus'], string> = {
  active: 'bg-status-success-light text-status-success',
  expiring: 'bg-status-warning-light text-brand-gold-text',
  expired: 'bg-brand-red-light text-brand-red',
};

const warrantyLabel: Record<Asset['warrantyStatus'], string> = {
  active: 'ใช้งานได้',
  expiring: 'ใกล้หมด',
  expired: 'หมดอายุ',
};

export default function AssetsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'' | Asset['warrantyStatus']>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { filter, search }],
    queryFn: () =>
      listAssets({
        warrantyStatus: filter || undefined,
        search: search || undefined,
        pageSize: 50,
      }),
  });

  return (
    <>
      <PageHeader
        title={t('assetsPage.title')}
        subtitle={t('assetsPage.subtitle')}
      />

      <div className="p-6">
        <div className="mb-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-gray-600">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหา S/N / ชื่อสินค้า / ลูกค้า"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-brand p-1">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1 rounded text-xs font-semibold ${!filter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
            >
              ทั้งหมด
            </button>
            {(['active', 'expiring', 'expired'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded text-xs font-semibold ${filter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
              >
                {warrantyLabel[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">Serial No</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">สินค้า</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ลูกค้า</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ติดตั้ง</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ประกัน</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">PM ถัดไป</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-600">กำลังโหลด...</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-600">ยังไม่มี Asset</td>
                </tr>
              )}
              {data?.items.map((a: Asset) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{a.serialNo}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{a.product.name}</div>
                    <div className="text-[10px] text-gray-700 font-mono">{a.product.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(a.installedAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${warrantyPill[a.warrantyStatus]}`}>
                      {warrantyLabel[a.warrantyStatus]}
                    </div>
                    <div className="text-[10px] text-gray-700 mt-0.5">
                      {a.warrantyDaysLeft > 0 ? `เหลือ ${a.warrantyDaysLeft} วัน` : `เลย ${Math.abs(a.warrantyDaysLeft)} วัน`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {a.nextPmDate ? new Date(a.nextPmDate).toLocaleDateString('th-TH') : '–'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a._count.tickets > 0 ? (
                      <span className="text-xs font-bold text-brand-red">{a._count.tickets}</span>
                    ) : (
                      <span className="text-xs text-gray-600">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
