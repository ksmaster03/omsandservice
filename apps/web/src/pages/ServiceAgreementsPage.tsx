import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listCustomers } from '../lib/queries';
import api from '../lib/api';

interface SA { id: string; agreementNo: string; type: string; status: string; price: string; startDate: string; endDate: string; autoRenew: boolean; note: string | null; customer: { id: string; name: string } }

const STATUS_COLOR: Record<string, string> = { DRAFT: 'bg-gray-200 text-gray-600', ACTIVE: 'bg-status-success-light text-status-success', EXPIRED: 'bg-brand-red-light text-brand-red', CANCELLED: 'bg-gray-200 text-gray-500' };

export default function ServiceAgreementsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ customerId: '', type: 'PM_PACKAGE', startDate: '', endDate: '', price: '', autoRenew: false, coverage: '', note: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['service-agreements'],
    queryFn: async () => { const r = await api.get('/internal/service-agreements'); return r.data.data as SA[]; },
  });
  const customers = useQuery({ queryKey: ['customers', { pageSize: 100 }], queryFn: () => listCustomers({ pageSize: 100 }), enabled: openCreate });

  const createMut = useMutation({
    mutationFn: async () => {
      await api.post('/internal/service-agreements', {
        ...form,
        price: Number(form.price),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-agreements'] }); setOpenCreate(false); },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { await api.patch(`/internal/service-agreements/${id}/status`, { status }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-agreements'] }),
  });

  return (
    <>
      <PageHeader title={t('nav.serviceAgreements')} subtitle="สัญญาบริการ / PM Package" action={<Button onClick={() => setOpenCreate(true)}><span className="material-symbols-outlined !text-[18px]">add</span>{t('common.add')}</Button>} />
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">เลขที่</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">{t('common.customer')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ประเภท</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ราคา</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ระยะเวลา</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">{t('common.status')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Auto Renew</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">{t('common.loading')}</td></tr>}
              {!isLoading && (!data || data.length === 0) && <tr><td colSpan={8} className="text-center py-8 text-gray-400">ยังไม่มี Service Agreement</td></tr>}
              {data?.map((sa) => (
                <tr key={sa.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-navy font-semibold">{sa.agreementNo}</td>
                  <td className="px-4 py-3 font-semibold">{sa.customer.name}</td>
                  <td className="px-4 py-3 text-xs">{sa.type}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">฿{Number(sa.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-xs">{new Date(sa.startDate).toLocaleDateString('th-TH')} — {new Date(sa.endDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[sa.status]}`}>{sa.status}</span></td>
                  <td className="px-4 py-3 text-center">{sa.autoRenew ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {sa.status === 'DRAFT' && <Button size="sm" variant="navy" onClick={() => statusMut.mutate({ id: sa.id, status: 'ACTIVE' })}>Activate</Button>}
                    {sa.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: sa.id, status: 'CANCELLED' })}>Cancel</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="สร้าง Service Agreement" footer={<><Button variant="outline" onClick={() => setOpenCreate(false)}>{t('common.cancel')}</Button><Button onClick={() => createMut.mutate()} disabled={!form.customerId || !form.price || !form.startDate || !form.endDate || createMut.isPending}>{createMut.isPending ? t('common.saving') : t('common.save')}</Button></>}>
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.customer')} *</label>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm">
              <option value="">{t('common.selectPlaceholder')}</option>
              {customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">ประเภท</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm">
              <option value="PM_PACKAGE">PM Package</option>
              <option value="FULL_SERVICE">Full Service</option>
              <option value="EXTENDED_WARRANTY">Extended Warranty</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="sa-start" label="เริ่ม *" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input id="sa-end" label="สิ้นสุด *" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input id="sa-price" label="ราคา (บาท) *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input id="sa-cov" label="Coverage" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} placeholder="เช่น PM 4 ครั้ง/ปี + อะไหล่ฟรี" />
          <Input id="sa-note" label={t('common.note')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} /> Auto Renew เมื่อหมดสัญญา</label>
        </div>
      </Modal>
    </>
  );
}
