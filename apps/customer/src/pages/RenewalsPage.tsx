import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listRenewals, type Renewal } from '../lib/queries';

const STATUS_COLOR: Record<string, string> = {
  OFFERED: 'bg-status-info-light text-status-info',
  ACCEPTED: 'bg-status-warning-light text-brand-gold-text',
  PAID: 'bg-status-success-light text-status-success',
  EXPIRED: 'bg-gray-200 text-gray-500',
};

export default function RenewalsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'th';

  const { data, isLoading } = useQuery({
    queryKey: ['customer-renewals'],
    queryFn: listRenewals,
  });

  const STATUS_LABEL: Record<string, Record<string, string>> = {
    th: { OFFERED: 'รอตอบรับ', ACCEPTED: 'ตอบรับแล้ว', PAID: 'ชำระแล้ว', EXPIRED: 'หมดอายุ' },
    en: { OFFERED: 'Offered', ACCEPTED: 'Accepted', PAID: 'Paid', EXPIRED: 'Expired' },
  };

  const TYPE_LABEL: Record<string, Record<string, string>> = {
    th: { STANDARD: 'มาตรฐาน (12 เดือน)', PREMIUM: 'พรีเมียม (12 เดือน)' },
    en: { STANDARD: 'Standard (12 months)', PREMIUM: 'Premium (12 months)' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="font-display font-bold text-lg">
          {lang === 'th' ? 'ต่อประกัน' : 'Warranty Renewals'}
        </h1>
        <p className="text-xs text-white/60 mt-0.5">
          {lang === 'th' ? 'ข้อเสนอต่อประกันสำหรับเครื่องของคุณ' : 'Warranty extension offers for your equipment'}
        </p>
      </header>

      <main className="p-4 space-y-3 pb-24">
        {isLoading && <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>}

        {!isLoading && (!data || data.length === 0) && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <span className="material-symbols-outlined !text-[48px] block mb-2 text-gray-300">verified</span>
            {lang === 'th' ? 'ยังไม่มีข้อเสนอต่อประกัน' : 'No renewal offers yet'}
          </div>
        )}

        {data?.map((r: Renewal) => (
          <div key={r.id} className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}>
                {STATUS_LABEL[lang]?.[r.status] ?? r.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
              </span>
            </div>

            <div className="text-sm font-semibold text-gray-900">{r.asset.product.name}</div>
            <div className="text-[10px] text-gray-500 font-mono">{r.asset.serialNo}</div>

            <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-brand p-3">
              <div>
                <div className="text-xs text-gray-500">{lang === 'th' ? 'แพ็กเกจ' : 'Package'}</div>
                <div className="text-sm font-semibold text-brand-navy">
                  {TYPE_LABEL[lang]?.[r.type] ?? r.type}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{lang === 'th' ? 'ราคา' : 'Price'}</div>
                <div className="text-lg font-bold text-brand-red">
                  ฿{Number(r.price).toLocaleString()}
                </div>
              </div>
            </div>

            {r.newEndDate && (
              <div className="text-xs text-gray-500 mt-2">
                {lang === 'th' ? 'ประกันใหม่ถึง' : 'New warranty until'}: {new Date(r.newEndDate).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
              </div>
            )}

            {r.status === 'OFFERED' && (
              <div className="mt-3 text-xs text-center text-gray-500 bg-status-info-light rounded-brand p-2">
                {lang === 'th'
                  ? 'กรุณาติดต่อทีมขายเพื่อตอบรับข้อเสนอ'
                  : 'Please contact sales team to accept this offer'}
              </div>
            )}
            {r.paidAt && (
              <div className="mt-2 text-xs text-status-success font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined !text-[14px]">check_circle</span>
                {lang === 'th' ? 'ชำระแล้วเมื่อ' : 'Paid on'} {new Date(r.paidAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
