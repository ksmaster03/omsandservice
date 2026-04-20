import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../lib/api';

interface SparePart { id: string; partNo: string; name: string; category: string | null; unit: string; costPrice: string | null; sellPrice: string | null; onHand: number; reorderAt: number; active: boolean }

export default function SparePartsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ partNo: '', name: '', category: '', unit: 'EA', costPrice: '', sellPrice: '', onHand: '0', reorderAt: '0' });

  const { data, isLoading } = useQuery({
    queryKey: ['spare-parts'],
    queryFn: async () => { const r = await api.get('/internal/spare-parts'); return r.data.data as SparePart[]; },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      await api.post('/internal/spare-parts', {
        ...form,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        sellPrice: form.sellPrice ? Number(form.sellPrice) : undefined,
        onHand: Number(form.onHand),
        reorderAt: Number(form.reorderAt),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spare-parts'] }); setOpenCreate(false); setForm({ partNo: '', name: '', category: '', unit: 'EA', costPrice: '', sellPrice: '', onHand: '0', reorderAt: '0' }); },
  });

  return (
    <>
      <PageHeader title={t('nav.spareParts')} subtitle="อะไหล่สำหรับงานซ่อม + PM" action={<Button onClick={() => setOpenCreate(true)}><span className="material-symbols-outlined !text-[18px]">add</span>{t('common.add')}</Button>} />
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-700">Part No</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-700">{t('common.name')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-700">Category</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-700">On Hand</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-700">Reorder</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-700">Cost</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-700">Sell</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton rows={8} columns={7} />}
              {!isLoading && (!data || data.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState icon="settings_suggest" title="ยังไม่มีอะไหล่" variant="compact" />
                  </td>
                </tr>
              )}
              {data?.map((p) => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${p.onHand <= p.reorderAt ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{p.partNo}</td>
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.category || '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${p.onHand <= p.reorderAt ? 'text-brand-red' : 'text-status-success'}`}>{p.onHand}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{p.reorderAt}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.costPrice ? `฿${Number(p.costPrice).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.sellPrice ? `฿${Number(p.sellPrice).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="เพิ่มอะไหล่" footer={<><Button variant="outline" onClick={() => setOpenCreate(false)}>{t('common.cancel')}</Button><Button onClick={() => createMut.mutate()} disabled={!form.partNo || !form.name || createMut.isPending}>{createMut.isPending ? t('common.saving') : t('common.save')}</Button></>}>
        <Input id="sp-no" label="Part No *" value={form.partNo} onChange={(e) => setForm({ ...form, partNo: e.target.value })} />
        <Input id="sp-name" label={`${t('common.name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input id="sp-cat" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input id="sp-unit" label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="sp-cost" label="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <Input id="sp-sell" label="Sell Price" type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="sp-oh" label="On Hand" type="number" value={form.onHand} onChange={(e) => setForm({ ...form, onHand: e.target.value })} />
          <Input id="sp-ro" label="Reorder At" type="number" value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
