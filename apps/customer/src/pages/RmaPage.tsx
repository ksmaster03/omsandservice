import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listRmas, createRma, listAssets, type CustomerRma } from '../lib/queries';

const RMA_REASONS = ['DOA', 'DEFECT', 'WRONG_ITEM', 'CUSTOMER_CHANGE_MIND', 'WARRANTY_CLAIM', 'OTHER'] as const;

const REASON_LABELS: Record<string, Record<string, string>> = {
  th: {
    DOA: 'เสียตั้งแต่แกะกล่อง',
    DEFECT: 'ชำรุด/ผิดปกติ',
    WRONG_ITEM: 'ส่งผิดรุ่น',
    CUSTOMER_CHANGE_MIND: 'เปลี่ยนใจ',
    WARRANTY_CLAIM: 'เคลมประกัน',
    OTHER: 'อื่นๆ',
  },
  en: {
    DOA: 'Dead on arrival',
    DEFECT: 'Defective',
    WRONG_ITEM: 'Wrong item',
    CUSTOMER_CHANGE_MIND: 'Changed mind',
    WARRANTY_CLAIM: 'Warranty claim',
    OTHER: 'Other',
  },
};

const STAGE_LABELS: Record<string, Record<string, string>> = {
  th: {
    REQUESTED: 'รอพิจารณา',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ปฏิเสธ',
    PICKUP_SCHEDULED: 'นัดรับแล้ว',
    PICKED_UP: 'รับเครื่องแล้ว',
    INSPECTING: 'กำลังตรวจสอบ',
    REFUNDED: 'คืนเงินแล้ว',
    REPLACED: 'เปลี่ยนเครื่องแล้ว',
    REFURBISHED: 'ซ่อมและคืนแล้ว',
    CANCELLED: 'ยกเลิก',
  },
  en: {
    REQUESTED: 'Pending review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PICKUP_SCHEDULED: 'Pickup scheduled',
    PICKED_UP: 'Picked up',
    INSPECTING: 'Inspecting',
    REFUNDED: 'Refunded',
    REPLACED: 'Replaced',
    REFURBISHED: 'Refurbished',
    CANCELLED: 'Cancelled',
  },
};

export default function RmaPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'th';
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ assetId: '', reason: 'DEFECT', description: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: rmas, isLoading } = useQuery({
    queryKey: ['customer-rmas'],
    queryFn: listRmas,
  });

  const { data: assets } = useQuery({
    queryKey: ['customer-assets'],
    queryFn: listAssets,
    enabled: openCreate,
  });

  const createMut = useMutation({
    mutationFn: () => createRma(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-rmas'] });
      setOpenCreate(false);
      setForm({ assetId: '', reason: 'DEFECT', description: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('common.cancel');
      setError(msg);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="font-display font-bold text-lg">
          {lang === 'th' ? 'การคืนสินค้า / RMA' : 'Returns / RMA'}
        </h1>
      </header>

      <main className="p-4 space-y-3 pb-24">
        <button
          onClick={() => setOpenCreate(true)}
          className="w-full py-3 bg-brand-red text-white font-semibold rounded-brand flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined !text-[20px]">assignment_return</span>
          {lang === 'th' ? 'เปิดเรื่องคืนสินค้า' : 'Request a return'}
        </button>

        {isLoading && <div className="text-center py-8 text-gray-600">{t('common.loading')}</div>}
        {!isLoading && rmas?.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            {lang === 'th' ? 'ยังไม่เคยแจ้งคืนสินค้า' : 'No return requests yet'}
          </div>
        )}
        {rmas?.map((r: CustomerRma) => (
          <div key={r.id} className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-xs text-brand-navy font-bold">{r.rmaNo}</div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-status-info-light text-status-info">
                {STAGE_LABELS[lang]?.[r.stage] ?? r.stage}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900">{r.asset.product.name}</div>
            <div className="text-[10px] text-gray-700 font-mono">{r.asset.serialNo}</div>
            <div className="text-xs text-gray-600 mt-1">
              {REASON_LABELS[lang]?.[r.reason] ?? r.reason} — {r.description.slice(0, 80)}
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              {new Date(r.createdAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
            </div>
          </div>
        ))}
      </main>

      {/* Create modal */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <h2 className="font-display font-bold text-lg mb-4">
              {lang === 'th' ? 'เปิดเรื่องคืนสินค้า' : 'Request a return'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === 'th' ? 'เลือกเครื่อง *' : 'Select device *'}
                </label>
                <select
                  value={form.assetId}
                  onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm"
                >
                  <option value="">—</option>
                  {assets?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.product.name} · {a.serialNo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === 'th' ? 'เหตุผล *' : 'Reason *'}
                </label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm"
                >
                  {RMA_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABELS[lang]?.[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === 'th' ? 'รายละเอียด *' : 'Description *'}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm"
                  placeholder={lang === 'th' ? 'อธิบายปัญหา / เหตุผลที่ต้องการคืน' : 'Describe the issue'}
                />
              </div>

              {error && (
                <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setOpenCreate(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-brand"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={!form.assetId || !form.description || createMut.isPending}
                className="flex-1 py-2.5 bg-brand-red text-white font-semibold rounded-brand disabled:opacity-50"
              >
                {createMut.isPending
                  ? (lang === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                  : (lang === 'th' ? 'ส่งเรื่อง' : 'Submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
