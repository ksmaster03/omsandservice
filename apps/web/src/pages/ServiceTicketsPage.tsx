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
  listTickets,
  getTicket,
  createTicket,
  updateTicketStage,
  listCustomers,
  listAssets,
  type ServiceTicket,
  type TicketStage,
} from '../lib/queries';
import { allowedTransitions, TICKET_EVENT_LABELS_TH } from '@oms/shared';

const STAGES: TicketStage[] = ['RECEIVED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'REPAIRING', 'CLOSED'];

const PRIORITY_COLOR: Record<ServiceTicket['priority'], string> = {
  URGENT: 'bg-brand-red text-white',
  NORMAL: 'bg-status-warning text-brand-navy',
  LOW: 'bg-status-success text-white',
};

const PRIORITY_ICON: Record<ServiceTicket['priority'], string> = {
  URGENT: 'priority_high',
  NORMAL: 'schedule',
  LOW: 'low_priority',
};

const STAGE_ICON: Record<TicketStage, string> = {
  RECEIVED: 'inbox',
  ASSIGNED: 'person_pin',
  EN_ROUTE: 'directions_car',
  ARRIVED: 'place',
  REPAIRING: 'build',
  CLOSED: 'check_circle',
  CANCELLED: 'cancel',
};

const STAGE_COLOR: Record<TicketStage, string> = {
  RECEIVED: 'bg-status-info-light text-status-info',
  ASSIGNED: 'bg-status-warning-light text-brand-gold-text',
  EN_ROUTE: 'bg-status-warning-light text-brand-gold-text',
  ARRIVED: 'bg-status-info-light text-status-info',
  REPAIRING: 'bg-brand-red/10 text-brand-red',
  CLOSED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

export default function ServiceTicketsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const STAGE_LABEL: Record<TicketStage, string> = {
    RECEIVED: t('tickets.stageReceived'),
    ASSIGNED: t('tickets.stageAssigned'),
    EN_ROUTE: t('tickets.stageEnRoute'),
    ARRIVED: t('tickets.stageArrived'),
    REPAIRING: t('tickets.stageRepairing'),
    CLOSED: t('tickets.stageClosed'),
    CANCELLED: t('tickets.stageCancelled'),
  };

  const PROBLEM_LABEL: Record<ServiceTicket['problemType'], string> = {
    BELT: t('tickets.problemBelt'),
    NOISE: t('tickets.problemNoise'),
    CONSOLE: t('tickets.problemConsole'),
    MOTOR: t('tickets.problemMotor'),
    POWER: t('tickets.problemPower'),
    PM: t('tickets.problemPm'),
    OTHER: t('tickets.problemOther'),
  };

  const PRIORITY_LABEL: Record<ServiceTicket['priority'], string> = {
    URGENT: t('tickets.priorityUrgent'),
    NORMAL: t('tickets.priorityNormal'),
    LOW: t('tickets.priorityLow'),
  };
  const [stageFilter, setStageFilter] = useState<TicketStage | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const list = useQuery({
    queryKey: ['tickets', { stageFilter }],
    queryFn: () => listTickets({ stage: stageFilter || undefined, pageSize: 50 }),
  });

  const detail = useQuery({
    queryKey: ['ticket', selectedId],
    queryFn: () => getTicket(selectedId!),
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
    problemType: 'OTHER' as ServiceTicket['problemType'],
    priority: 'NORMAL' as ServiceTicket['priority'],
    description: '',
    locationDetail: '',
  });
  const [error, setError] = useState<string | null>(null);

  const customerAssets = useQuery({
    queryKey: ['assets', { customerId: form.customerId }],
    queryFn: () => listAssets({ customerId: form.customerId, pageSize: 100 }),
    enabled: !!form.customerId && openCreate,
  });

  const createMut = useMutation({
    mutationFn: () => createTicket(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setOpenCreate(false);
      setForm({
        customerId: '',
        assetId: '',
        problemType: 'OTHER',
        priority: 'NORMAL',
        description: '',
        locationDetail: '',
      });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('tickets.createFailed');
      setError(msg);
    },
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: TicketStage }) => updateTicketStage(id, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket'] });
    },
  });

  // Transition buttons are driven by the shared XState machine — whatever
  // stage the ticket is in, we ask the machine which events are legal
  // and render one button per event. Server validates the same way, so
  // UI and API can never disagree on what's allowed.

  return (
    <>
      <PageHeader
        title={t('tickets.title')}
        subtitle={t('tickets.subtitle')}
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            {t('tickets.addButton')}
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit flex-wrap">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1 rounded text-xs font-semibold ${!stageFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
          >
            {t('common.all')}
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold ${stageFilter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'}`}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('so.colNo')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('common.customer')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('tickets.problemLabel')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('tickets.fieldPriority')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('common.status')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <TableSkeleton rows={8} columns={6} />}
              {!list.isLoading && list.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState icon="confirmation_number" title={t('common.noData')} variant="compact" />
                  </td>
                </tr>
              )}
              {list.data?.items.map((ticket: ServiceTicket) => (
                <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{ticket.ticketNo}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{ticket.customer.name}</div>
                    <div className="text-[10px] text-gray-700 font-mono">{ticket.asset.serialNo}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="font-semibold">{PROBLEM_LABEL[ticket.problemType]}</div>
                    <div className="text-[10px] text-gray-700 line-clamp-1">{ticket.description}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLOR[ticket.priority]}`}>
                      <span className="material-symbols-outlined !text-[12px]" aria-hidden="true">{PRIORITY_ICON[ticket.priority]}</span>
                      {PRIORITY_LABEL[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STAGE_COLOR[ticket.stage] ?? 'bg-gray-100 text-gray-700'}`}>
                      <span className="material-symbols-outlined !text-[13px]" aria-hidden="true">{STAGE_ICON[ticket.stage] ?? 'circle'}</span>
                      {STAGE_LABEL[ticket.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(ticket.id)}>
                      {t('tickets.openTicket')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal with timeline */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail.data?.ticketNo ?? t('tickets.title')}
      >
        {detail.isLoading && <div className="text-gray-600 text-sm py-4">{t('common.loading')}</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs">
              <div><strong>{t('common.customer')}:</strong> {detail.data.customer.name}</div>
              <div><strong>{t('common.product')}:</strong> {detail.data.asset.product.name} (<span className="font-mono">{detail.data.asset.serialNo}</span>)</div>
              <div><strong>{t('tickets.problemLabel')}:</strong> {PROBLEM_LABEL[detail.data.problemType]} — <span className={`ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLOR[detail.data.priority]}`}>{PRIORITY_LABEL[detail.data.priority]}</span></div>
              <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">{detail.data.description}</div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">{t('tickets.historyHeader')}</div>
              <div className="space-y-1.5">
                {detail.data.events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-brand-red mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{STAGE_LABEL[e.stage]}</div>
                      {e.note && <div className="text-gray-700 text-[11px]">{e.note}</div>}
                      <div className="text-[10px] text-gray-600">
                        {new Date(e.createdAt).toLocaleString('th-TH')}
                        {e.actor && ` · ${e.actor.name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {allowedTransitions(detail.data.stage).length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-2">{t('tickets.nextAction')}</div>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions(detail.data.stage).map(({ event, to }) => {
                    const isDestructive = to === 'CANCELLED';
                    return (
                      <Button
                        key={event}
                        size="sm"
                        variant={isDestructive ? 'outline' : 'navy'}
                        onClick={() => stageMut.mutate({ id: detail.data!.id, stage: to })}
                        disabled={stageMut.isPending}
                      >
                        {TICKET_EVENT_LABELS_TH[event] ?? event} → {STAGE_LABEL[to]}
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
        title={t('tickets.addModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.customerId || !form.assetId || !form.description || createMut.isPending}
            >
              {createMut.isPending ? t('common.saving') : t('tickets.createBtn')}
            </Button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tickets.fieldCustomer')}</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, assetId: '' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {customers.data?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tickets.fieldAsset')}</label>
          <select
            value={form.assetId}
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
            disabled={!form.customerId}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy disabled:bg-gray-100"
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {customerAssets.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.product.name} · {a.serialNo}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tickets.fieldProblemType')}</label>
            <select
              value={form.problemType}
              onChange={(e) => setForm({ ...form, problemType: e.target.value as ServiceTicket['problemType'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              {(Object.keys(PROBLEM_LABEL) as Array<ServiceTicket['problemType']>).map((p) => (
                <option key={p} value={p}>{PROBLEM_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tickets.fieldPriority')}</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as ServiceTicket['priority'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              {(Object.keys(PRIORITY_LABEL) as Array<ServiceTicket['priority']>).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tickets.fieldDescription')}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          />
        </div>

        <Input
          id="t-loc"
          label={t('common.address')}
          value={form.locationDetail}
          onChange={(e) => setForm({ ...form, locationDetail: e.target.value })}
        />

        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
