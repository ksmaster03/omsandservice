import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import {
  listRmas,
  getRma,
  createRma,
  updateRmaStage,
  listCustomers,
  listAssets,
  type Rma,
} from '../lib/queries';
import {
  RMA_REASONS,
  RMA_REASON_LABELS_TH,
  RMA_STAGES,
  RMA_STAGE_LABELS_TH,
  RMA_EVENT_LABELS_TH,
  rmaAllowedTransitions,
  type RmaStage,
} from '@oms/shared';

const STAGE_COLOR: Record<string, string> = {
  REQUESTED: 'bg-status-info-light text-status-info',
  APPROVED: 'bg-status-info-light text-status-info',
  REJECTED: 'bg-brand-red-light text-brand-red',
  PICKUP_SCHEDULED: 'bg-status-warning-light text-brand-gold-text',
  PICKED_UP: 'bg-status-warning-light text-brand-gold-text',
  INSPECTING: 'bg-status-warning-light text-brand-gold-text',
  REFUNDED: 'bg-status-success-light text-status-success',
  REPLACED: 'bg-status-success-light text-status-success',
  REFURBISHED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

const STAGE_ICON: Record<string, string> = {
  REQUESTED: 'inbox',
  APPROVED: 'check',
  REJECTED: 'close',
  PICKUP_SCHEDULED: 'schedule',
  PICKED_UP: 'local_shipping',
  INSPECTING: 'search',
  REFUNDED: 'payments',
  REPLACED: 'swap_horiz',
  REFURBISHED: 'verified',
  CANCELLED: 'cancel',
};

export default function RmaPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [stageFilter, setStageFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const list = useQuery({
    queryKey: ['rmas', { stageFilter }],
    queryFn: () => listRmas({ stage: stageFilter || undefined, pageSize: 50 }),
  });

  const detail = useQuery({
    queryKey: ['rma', selectedId],
    queryFn: () => getRma(selectedId!),
    enabled: !!selectedId,
  });

  const customers = useQuery({
    queryKey: ['customers', { pageSize: 100 }],
    queryFn: () => listCustomers({ pageSize: 100 }),
    enabled: openCreate,
  });

  const [form, setForm] = useState({
    customerId: '',
    assetId: '',
    reason: 'DEFECT',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const customerAssets = useQuery({
    queryKey: ['assets', { customerId: form.customerId }],
    queryFn: () => listAssets({ customerId: form.customerId, pageSize: 100 }),
    enabled: !!form.customerId && openCreate,
  });

  const createMut = useMutation({
    mutationFn: () => createRma(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rmas'] });
      setOpenCreate(false);
      setForm({ customerId: '', assetId: '', reason: 'DEFECT', description: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('rmas.createFailed');
      setError(msg);
    },
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => updateRmaStage(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rmas'] });
      qc.invalidateQueries({ queryKey: ['rma'] });
    },
  });

  return (
    <>
      <PageHeader
        title={t('rmas.title')}
        subtitle={t('rmas.subtitle')}
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            {t('rmas.addButton')}
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit flex-wrap">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1 rounded text-xs font-semibold ${!stageFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
          >
            {t('common.all')}
          </button>
          {RMA_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold ${stageFilter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
            >
              {RMA_STAGE_LABELS_TH[s]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('rmas.colNo')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('rmas.colCustomer')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('rmas.colAsset')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('rmas.colReason')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('common.status')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <TableSkeleton rows={8} columns={6} />}
              {!list.isLoading && list.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState icon="assignment_return" title={t('rmas.empty')} variant="compact" />
                  </td>
                </tr>
              )}
              {list.data?.items.map((r: Rma) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{r.rmaNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{r.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {r.asset.product.name}
                    <div className="font-mono text-[10px] text-gray-700">{r.asset.serialNo}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {RMA_REASON_LABELS_TH[r.reason as keyof typeof RMA_REASON_LABELS_TH] ?? r.reason}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STAGE_COLOR[r.stage] ?? 'bg-gray-100 text-gray-700'}`}>
                      <span className="material-symbols-outlined !text-[13px]" aria-hidden="true">{STAGE_ICON[r.stage] ?? 'circle'}</span>
                      {RMA_STAGE_LABELS_TH[r.stage as RmaStage] ?? r.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>
                      {t('common.actions')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail.data ? t('rmas.detailTitle', { no: detail.data.rmaNo }) : t('rmas.title')}
      >
        {detail.isLoading && <div className="text-gray-600 text-sm py-4">{t('common.loading')}</div>}
        {detail.data && (
          <div className="space-y-3 text-sm">
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                {t('common.customer')}: <strong>{detail.data.customer.name}</strong>
              </div>
              <div>
                {t('common.product')}: <strong>{detail.data.asset.product.name}</strong> · <span className="font-mono">{detail.data.asset.serialNo}</span>
              </div>
              <div>
                {t('rmas.reasonLabel')}:{' '}
                <strong>
                  {RMA_REASON_LABELS_TH[detail.data.reason as keyof typeof RMA_REASON_LABELS_TH] ?? detail.data.reason}
                </strong>
              </div>
              <div>
                {t('common.status')}:{' '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STAGE_COLOR[detail.data.stage] ?? ''}`}>
                  <span className="material-symbols-outlined !text-[13px]" aria-hidden="true">{STAGE_ICON[detail.data.stage] ?? 'circle'}</span>
                  {RMA_STAGE_LABELS_TH[detail.data.stage as RmaStage] ?? detail.data.stage}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-brand p-2 text-xs text-gray-700 whitespace-pre-wrap">
              {detail.data.description}
            </div>

            {/* Timeline */}
            <div>
              <div className="text-xs font-bold text-gray-700 mb-1">{t('rmas.historyHeader')}</div>
              <div className="space-y-1 text-[11px] text-gray-600">
                {detail.data.events.map((e) => (
                  <div key={e.id} className="flex gap-2">
                    <span className="font-mono text-gray-600">
                      {new Date(e.createdAt).toLocaleString('th-TH', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-semibold">{RMA_STAGE_LABELS_TH[e.stage as RmaStage] ?? e.stage}</span>
                    {e.note && <span className="text-gray-700">— {e.note}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Transition buttons */}
            {rmaAllowedTransitions(detail.data.stage as RmaStage).length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-2">{t('rmas.nextAction')}</div>
                <div className="flex flex-wrap gap-2">
                  {rmaAllowedTransitions(detail.data.stage as RmaStage).map(({ event, to }) => {
                    const isDestructive = to === 'CANCELLED' || to === 'REJECTED';
                    return (
                      <Button
                        key={event}
                        size="sm"
                        variant={isDestructive ? 'outline' : 'navy'}
                        onClick={() => stageMut.mutate({ id: detail.data!.id, stage: to })}
                        disabled={stageMut.isPending}
                      >
                        {RMA_EVENT_LABELS_TH[event] ?? event}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title={t('rmas.addModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.customerId || !form.assetId || !form.description || createMut.isPending}
            >
              {createMut.isPending ? t('common.saving') : t('rmas.createBtn')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('rmas.fieldCustomer')}</label>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value, assetId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              <option value="">{t('rmas.selectCustomer')}</option>
              {customers.data?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('rmas.fieldAsset')}</label>
            <select
              value={form.assetId}
              onChange={(e) => setForm({ ...form, assetId: e.target.value })}
              disabled={!form.customerId}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy disabled:opacity-50"
            >
              <option value="">{t('rmas.selectAsset')}</option>
              {customerAssets.data?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.product.name} · {a.serialNo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('rmas.fieldReason')}</label>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              {RMA_REASONS.map((r) => (
                <option key={r} value={r}>{RMA_REASON_LABELS_TH[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('rmas.fieldDescription')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
              placeholder={t('rmas.descriptionPlaceholder')}
            />
          </div>

          {error && (
            <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
          )}
        </div>
      </Modal>
    </>
  );
}
