import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Modal from '../components/Modal';
import {
  listSalesOrders,
  getSalesOrder,
  markMilestonePaid,
  listQuotations,
  createSOFromQuote,
  type SalesOrder,
  type SOStatus,
  type PaymentMilestone,
} from '../lib/queries';

// status labels resolved from i18n inside the component via useStatusLabel()

const STATUS_COLOR: Record<SOStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  CONFIRMED: 'bg-status-info-light text-status-info',
  IN_PRODUCTION: 'bg-status-warning-light text-brand-gold-text',
  READY_TO_DELIVER: 'bg-status-warning-light text-brand-gold-text',
  INSTALLED: 'bg-status-success-light text-status-success',
  COMPLETED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-brand-red-light text-brand-red',
};

const MS_COLOR: Record<PaymentMilestone['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  DUE: 'bg-status-warning-light text-brand-gold-text',
  PAID: 'bg-status-success-light text-status-success',
  OVERDUE: 'bg-brand-red-light text-brand-red',
};

export default function SalesOrdersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const STATUS_LABEL: Record<SOStatus, string> = {
    PENDING: t('so.statusPending'),
    CONFIRMED: t('so.statusConfirmed'),
    IN_PRODUCTION: t('so.statusInProduction'),
    READY_TO_DELIVER: t('so.statusReadyToDeliver'),
    INSTALLED: t('so.statusInstalled'),
    COMPLETED: t('so.statusCompleted'),
    CANCELLED: t('so.statusCancelled'),
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openConvert, setOpenConvert] = useState(false);

  const { data: list, isLoading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: () => listSalesOrders({ pageSize: 50 }),
  });

  const acceptedQuotes = useQuery({
    queryKey: ['quotations', 'accepted-unconverted'],
    queryFn: () => listQuotations({ status: 'ACCEPTED', pageSize: 100 }),
    enabled: openConvert,
  });

  const detail = useQuery({
    queryKey: ['sales-order', selectedId],
    queryFn: () => getSalesOrder(selectedId!),
    enabled: !!selectedId,
  });

  const convertMut = useMutation({
    mutationFn: ({ quoteId, template }: { quoteId: string; template: '30_30_40' | '50_50' | 'FULL' }) =>
      createSOFromQuote(quoteId, template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setOpenConvert(false);
    },
  });

  const payMut = useMutation({
    mutationFn: (milestoneId: string) => markMilestonePaid(milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
    },
  });

  return (
    <>
      <PageHeader
        title={t('so.title')}
        subtitle={t('so.subtitle')}
        action={
          <Button onClick={() => setOpenConvert(true)}>
            <span className="material-symbols-outlined !text-[18px]">transform</span>
            {t('so.convertButton')}
          </Button>
        }
      />

      <div className="p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('so.colNo')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('common.customer')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('so.colAmount')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('so.colStatus')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('so.colPayments')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton rows={8} columns={6} />}
              {!isLoading && list?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-600">{t('so.empty')}</td>
                </tr>
              )}
              {list?.items.map((so: SalesOrder) => (
                <tr key={so.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{so.soNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{so.customer.name}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ฿{Number(so.total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[so.status]}`}>
                      {STATUS_LABEL[so.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">{so.paymentProgress}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(so.id)}>
                      {t('so.viewDetail')}
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
        title={detail.data?.soNo ?? t('so.title')}
      >
        {detail.isLoading && <div className="text-gray-600 text-sm py-4">{t('common.loading')}</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs text-gray-600">
              <div>{t('common.customer')}: <span className="font-semibold text-gray-900">{detail.data.customer.name}</span></div>
              <div>
                {t('common.status')}:{' '}
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[detail.data.status]}`}>
                  {STATUS_LABEL[detail.data.status]}
                </span>
              </div>
              <div>{t('so.totalLabel')}: <span className="font-semibold">฿{Number(detail.data.total).toLocaleString()}</span></div>
              {detail.data.quotation && (
                <div>{t('so.referenceQuote')}: <span className="font-mono">{detail.data.quotation.quoteNo}</span></div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">{t('so.items')}</div>
              <div className="border border-gray-200 rounded-brand overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">{t('common.product')}</th>
                      <th className="text-center px-2 py-1.5 font-semibold text-gray-600">{t('so.qty')}</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-gray-600">{t('so.unitPrice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.items.map((it) => (
                      <tr key={it.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">{it.product.name}</td>
                        <td className="px-2 py-1.5 text-center">{it.qty}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          ฿{Number(it.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">{t('so.milestones')}</div>
              <div className="space-y-1.5">
                {detail.data.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-50 rounded-brand px-3 py-2 border border-gray-200"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-900">{m.label}</div>
                      <div className="text-[10px] text-gray-700">
                        {t('so.dueDate')} {new Date(m.dueDate).toLocaleDateString('th-TH')}
                        {m.paidAt && ` · ${t('so.paidOn')} ${new Date(m.paidAt).toLocaleDateString('th-TH')}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">
                        ฿{Number(m.amount).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${MS_COLOR[m.status]}`}>
                        {m.status}
                      </span>
                      {m.status !== 'PAID' && (
                        <Button size="sm" onClick={() => payMut.mutate(m.id)}>
                          {t('so.markPaid')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Convert from quote modal */}
      <Modal
        open={openConvert}
        onClose={() => setOpenConvert(false)}
        title={t('so.convertModalTitle')}
      >
        <p className="text-xs text-gray-700 mb-3">
          {t('so.convertHelp')}
        </p>
        {acceptedQuotes.isLoading && <div className="text-gray-600 text-sm">{t('common.loading')}</div>}
        {acceptedQuotes.data?.items.length === 0 && (
          <div className="text-center py-6 text-gray-600 text-xs">
            {t('so.noAccepted')}
          </div>
        )}
        <div className="space-y-2">
          {acceptedQuotes.data?.items.map((q) => (
            <div key={q.id} className="border border-gray-200 rounded-brand p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-mono text-xs font-bold text-brand-navy">{q.quoteNo}</div>
                  <div className="text-sm font-semibold">{q.customer.name}</div>
                  <div className="text-xs text-gray-700">฿{Number(q.total).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex gap-1.5">
                {(['30_30_40', '50_50', 'FULL'] as const).map((tpl) => (
                  <Button
                    key={tpl}
                    size="sm"
                    variant="outline"
                    onClick={() => convertMut.mutate({ quoteId: q.id, template: tpl })}
                    disabled={convertMut.isPending}
                  >
                    {tpl === '30_30_40' ? '30/30/40' : tpl === '50_50' ? '50/50' : 'FULL'}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
