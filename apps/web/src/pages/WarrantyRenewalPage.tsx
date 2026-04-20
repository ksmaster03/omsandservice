import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import {
  listRenewalCandidates,
  listRenewals,
  createRenewalOffer,
  updateRenewalStatus,
  type RenewalCandidate,
  type Renewal,
} from '../lib/queries';

const STATUS_LABEL: Record<Renewal['status'], string> = {
  OFFERED: 'เสนอแล้ว',
  ACCEPTED: 'ลูกค้ารับ',
  PAID: 'ชำระแล้ว',
  EXPIRED: 'หมดอายุ',
};

const STATUS_COLOR: Record<Renewal['status'], string> = {
  OFFERED: 'bg-status-warning-light text-brand-gold-text',
  ACCEPTED: 'bg-status-info-light text-status-info',
  PAID: 'bg-status-success-light text-status-success',
  EXPIRED: 'bg-gray-200 text-gray-700',
};

export default function WarrantyRenewalPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'candidates' | 'offers'>('candidates');
  const [offerFor, setOfferFor] = useState<RenewalCandidate | null>(null);

  const candidates = useQuery({
    queryKey: ['renewal-candidates'],
    queryFn: listRenewalCandidates,
  });
  const offers = useQuery({
    queryKey: ['renewals'],
    queryFn: () => listRenewals({ pageSize: 100 }),
  });

  const [form, setForm] = useState({
    type: 'STANDARD' as 'STANDARD' | 'PREMIUM',
    price: '',
    extendMonths: '12',
  });

  const createMut = useMutation({
    mutationFn: () =>
      createRenewalOffer({
        assetId: offerFor!.id,
        type: form.type,
        price: Number(form.price),
        extendMonths: Number(form.extendMonths),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewal-candidates'] });
      qc.invalidateQueries({ queryKey: ['renewals'] });
      setOfferFor(null);
      setForm({ type: 'STANDARD', price: '', extendMonths: '12' });
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRenewalStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewals'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  return (
    <>
      <PageHeader
        title={t('renewals.title')}
        subtitle={t('renewals.subtitle')}
      />

      <div className="p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit">
          <button
            onClick={() => setTab('candidates')}
            className={`px-3 py-1 rounded text-xs font-semibold ${tab === 'candidates' ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
          >
            รอเสนอ ({candidates.data?.length ?? 0})
          </button>
          <button
            onClick={() => setTab('offers')}
            className={`px-3 py-1 rounded text-xs font-semibold ${tab === 'offers' ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
          >
            ข้อเสนอทั้งหมด ({offers.data?.total ?? 0})
          </button>
        </div>

        {tab === 'candidates' && (
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">เครื่อง</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ลูกค้า</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ประกันเหลือ</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ราคาแนะนำ</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {candidates.isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-600">กำลังโหลด...</td></tr>}
                {!candidates.isLoading && candidates.data?.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-600">ไม่มีเครื่องที่ต้องต่อประกันตอนนี้</td></tr>
                )}
                {candidates.data?.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">{a.product.name}</div>
                      <div className="text-[10px] text-gray-700 font-mono">{a.serialNo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.customer.name}</td>
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.daysLeft <= 30 ? 'bg-brand-red-light text-brand-red' : 'bg-status-warning-light text-brand-gold-text'}`}>
                        {a.daysLeft} วัน
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div>Std: ฿{a.suggestedPrice.standard12.toLocaleString()}</div>
                      <div className="text-gray-700">Prem: ฿{a.suggestedPrice.premium12.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setOfferFor(a);
                          setForm({ type: 'STANDARD', price: String(a.suggestedPrice.standard12), extendMonths: '12' });
                        }}
                      >
                        เสนอราคา
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'offers' && (
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">เครื่อง / ลูกค้า</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ประเภท</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ราคา</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ประกันใหม่ถึง</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">สถานะ</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {offers.isLoading && <tr><td colSpan={6} className="text-center py-8 text-gray-600">กำลังโหลด...</td></tr>}
                {!offers.isLoading && offers.data?.items.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-600">ยังไม่มีข้อเสนอ</td></tr>
                )}
                {offers.data?.items.map((r: Renewal) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">{r.asset.customer.name}</div>
                      <div className="text-[11px] text-gray-700">{r.asset.product.name} · <span className="font-mono">{r.asset.serialNo}</span></div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.type === 'PREMIUM' ? 'Premium' : 'Standard'}</td>
                    <td className="px-4 py-3 text-right font-semibold">฿{Number(r.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.newEndDate ? new Date(r.newEndDate).toLocaleDateString('th-TH') : '–'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status === 'OFFERED' && (
                          <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: r.id, status: 'ACCEPTED' })}>
                            ลูกค้ารับ
                          </Button>
                        )}
                        {r.status === 'ACCEPTED' && (
                          <Button size="sm" onClick={() => statusMut.mutate({ id: r.id, status: 'PAID' })}>
                            ชำระแล้ว
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!offerFor}
        onClose={() => setOfferFor(null)}
        title="เสนอราคาต่อประกัน"
        footer={
          <>
            <Button variant="outline" onClick={() => setOfferFor(null)}>ยกเลิก</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.price || createMut.isPending}>
              {createMut.isPending ? 'กำลังบันทึก...' : 'ส่งข้อเสนอ'}
            </Button>
          </>
        }
      >
        {offerFor && (
          <>
            <div className="bg-gray-50 rounded-brand p-3 mb-3 text-xs">
              <div><strong>{offerFor.customer.name}</strong></div>
              <div>{offerFor.product.name} · <span className="font-mono">{offerFor.serialNo}</span></div>
              <div className="text-gray-700 mt-1">ประกันปัจจุบันเหลือ {offerFor.daysLeft} วัน</div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภท</label>
              <div className="grid grid-cols-2 gap-2">
                {(['STANDARD', 'PREMIUM'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        type: t,
                        price: String(
                          t === 'PREMIUM' ? offerFor.suggestedPrice.premium12 : offerFor.suggestedPrice.standard12,
                        ),
                      });
                    }}
                    className={`py-2 rounded-brand text-xs font-semibold border ${
                      form.type === t ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {t === 'PREMIUM' ? 'Premium (15%)' : 'Standard (8%)'}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="r-price"
              label="ราคา (บาท)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              id="r-months"
              label="ต่ออายุ (เดือน)"
              type="number"
              value={form.extendMonths}
              onChange={(e) => setForm({ ...form, extendMonths: e.target.value })}
            />
          </>
        )}
      </Modal>
    </>
  );
}
