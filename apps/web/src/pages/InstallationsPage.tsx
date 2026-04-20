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
  listInstallations,
  getInstallation,
  assignInstallation,
  completeInstallation,
  scheduleInstallation,
  listSalesOrders,
  listUsers,
  type Installation,
  type SalesOrder,
} from '../lib/queries';
import { downloadIcs, type IcsEvent } from '../lib/ics';

// status labels resolved from i18n in the component

const STATUS_COLOR: Record<Installation['status'], string> = {
  SCHEDULED: 'bg-status-info-light text-status-info',
  IN_PROGRESS: 'bg-status-warning-light text-brand-gold-text',
  COMPLETED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

export default function InstallationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const STATUS_LABEL: Record<Installation['status'], string> = {
    SCHEDULED: t('installations.statusScheduled'),
    IN_PROGRESS: t('installations.statusInProgress'),
    COMPLETED: t('installations.statusCompleted'),
    CANCELLED: t('installations.statusCancelled'),
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [createSoId, setCreateSoId] = useState('');
  const [createScheduledAt, setCreateScheduledAt] = useState('');
  const [createTechId, setCreateTechId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['installations'],
    queryFn: () => listInstallations({ pageSize: 50 }),
  });

  const candidateSOs = useQuery({
    queryKey: ['sales-orders', 'install-candidates'],
    queryFn: () => listSalesOrders({ pageSize: 100 }),
    enabled: openCreate,
  });

  const createInstallTechs = useQuery({
    queryKey: ['users', 'install'],
    queryFn: () => listUsers({ role: 'INSTALL', pageSize: 100 }),
    enabled: openCreate,
  });

  const createMut = useMutation({
    mutationFn: () =>
      scheduleInstallation({
        soId: createSoId,
        scheduledAt: new Date(createScheduledAt).toISOString(),
        techId: createTechId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setOpenCreate(false);
      setCreateSoId('');
      setCreateScheduledAt('');
      setCreateTechId('');
      setCreateError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('installations.addModalTitle');
      setCreateError(msg);
    },
  });

  function closeCreate() {
    setOpenCreate(false);
    setCreateSoId('');
    setCreateScheduledAt('');
    setCreateTechId('');
    setCreateError(null);
  }

  const detail = useQuery({
    queryKey: ['installation', selectedId],
    queryFn: () => getInstallation(selectedId!),
    enabled: !!selectedId,
  });

  const installTechs = useQuery({
    queryKey: ['users', 'install'],
    queryFn: () => listUsers({ role: 'INSTALL', pageSize: 100 }),
    enabled: !!selectedId,
  });

  const [assignTechId, setAssignTechId] = useState('');
  const [note, setNote] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [serialNos, setSerialNos] = useState<Record<string, string>>({});

  const assignMut = useMutation({
    mutationFn: () => assignInstallation(selectedId!, assignTechId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations'] });
      qc.invalidateQueries({ queryKey: ['installation', selectedId] });
      setAssignTechId('');
    },
  });

  const completeMut = useMutation({
    mutationFn: () =>
      completeInstallation(selectedId!, {
        note: note || undefined,
        locationDetail: locationDetail || undefined,
        assets: Object.entries(serialNos)
          .filter(([, sn]) => sn.trim())
          .map(([soItemId, serialNo]) => ({ soItemId, serialNo: serialNo.trim() })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations'] });
      qc.invalidateQueries({ queryKey: ['installation', selectedId] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      setNote('');
      setLocationDetail('');
      setSerialNos({});
      setSelectedId(null);
    },
  });

  return (
    <>
      <PageHeader
        title={t('installations.title')}
        subtitle={t('installations.subtitle')}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const items = list.data?.items;
                if (!items?.length) return;
                const events: IcsEvent[] = items
                  .filter((inst: Installation) => inst.status !== 'CANCELLED')
                  .map((inst: Installation) => ({
                    uid: `install-${inst.id}@toptier-osm`,
                    title: `ติดตั้ง ${inst.so.soNo} — ${inst.so.customer.name}`,
                    description: inst.tech ? `ช่าง: ${inst.tech.name}` : undefined,
                    start: new Date(inst.scheduledAt),
                  }));
                downloadIcs(events, 'installations.ics');
              }}
            >
              <span className="material-symbols-outlined !text-[18px]">download</span>
              .ics
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <span className="material-symbols-outlined !text-[18px]">add</span>
              {t('installations.addButton')}
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('installations.colSo')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('installations.colCustomer')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('installations.colScheduled')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('installations.colTech')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">{t('installations.colStatus')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <TableSkeleton rows={8} columns={6} />}
              {!list.isLoading && list.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-600" dangerouslySetInnerHTML={{ __html: t('installations.empty') }} />
                </tr>
              )}
              {list.data?.items.map((inst: Installation) => (
                <tr key={inst.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{inst.so.soNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{inst.so.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {new Date(inst.scheduledAt).toLocaleString('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {inst.tech ? inst.tech.name : <span className="text-gray-600">{t('installations.notAssigned')}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[inst.status]}`}>
                      {STATUS_LABEL[inst.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(inst.id)}>
                      {t('installations.manage')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail.data ? t('installations.detailTitle', { no: detail.data.so.soNo }) : t('installations.title')}
        footer={
          detail.data && detail.data.status !== 'COMPLETED' ? (
            <>
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                {t('common.close')}
              </Button>
              <Button
                onClick={() => completeMut.mutate()}
                disabled={
                  !detail.data.so.items.every((it) => serialNos[it.id]?.trim()) || completeMut.isPending
                }
              >
                {completeMut.isPending ? t('common.saving') : t('installations.completeBtn')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelectedId(null)}>{t('common.close')}</Button>
          )
        }
      >
        {detail.isLoading && <div className="text-gray-600 text-sm py-4">{t('common.loading')}</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs text-gray-600">
              <div>{t('installations.customerLabel')}: <span className="font-semibold text-gray-900">{detail.data.so.customer.name}</span></div>
              <div>{t('common.status')}: <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[detail.data.status]}`}>{STATUS_LABEL[detail.data.status]}</span></div>
              <div>{t('installations.scheduledLabel')}: {new Date(detail.data.scheduledAt).toLocaleString('th-TH')}</div>
              {detail.data.completedAt && (
                <div>{t('installations.completedLabel')}: {new Date(detail.data.completedAt).toLocaleString('th-TH')}</div>
              )}
            </div>

            {detail.data.status !== 'COMPLETED' && (
              <div>
                <div className="text-xs font-bold text-gray-700 mb-2">{t('installations.assignHeader')}</div>
                <div className="flex gap-2">
                  <select
                    value={assignTechId}
                    onChange={(e) => setAssignTechId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
                  >
                    <option value="">{t('installations.selectTechPlaceholder')}</option>
                    {installTechs.data?.items.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="md"
                    disabled={!assignTechId || assignMut.isPending}
                    onClick={() => assignMut.mutate()}
                  >
                    {t('installations.assignBtn')}
                  </Button>
                </div>
                {detail.data.tech && (
                  <div className="text-[11px] text-gray-700 mt-1">
                    {t('installations.currentTech')}: {detail.data.tech.name}
                  </div>
                )}
              </div>
            )}

            {detail.data.status !== 'COMPLETED' && (
              <div>
                <div className="text-xs font-bold text-gray-700 mb-2">
                  {t('installations.serialsHeader')}
                </div>
                <div className="space-y-2">
                  {detail.data.so.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-gray-900">{it.product.name}</div>
                        <div className="text-gray-700 font-mono text-[10px]">{it.product.sku}</div>
                      </div>
                      <input
                        type="text"
                        placeholder="S/N"
                        value={serialNos[it.id] ?? ''}
                        onChange={(e) => setSerialNos({ ...serialNos, [it.id]: e.target.value })}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Input
                    id="inst-loc"
                    label={t('installations.locationLabel')}
                    placeholder={t('installations.locationPlaceholder')}
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                  />
                  <Input
                    id="inst-note"
                    label={t('installations.noteLabel')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={openCreate}
        onClose={closeCreate}
        title={t('installations.addModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={closeCreate}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!createSoId || !createScheduledAt || createMut.isPending}
            >
              {createMut.isPending ? t('installations.creating') : t('installations.createButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('installations.selectSo')}
            </label>
            <select
              value={createSoId}
              onChange={(e) => setCreateSoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              <option value="">{t('installations.selectSoPlaceholder')}</option>
              {candidateSOs.data?.items
                .filter((so: SalesOrder) => !so.installation && so.status !== 'CANCELLED')
                .map((so: SalesOrder) => (
                  <option key={so.id} value={so.id}>
                    {so.soNo} · {so.customer.name} · ฿{Number(so.total).toLocaleString()}
                  </option>
                ))}
            </select>
            {candidateSOs.data &&
              candidateSOs.data.items.filter((so: SalesOrder) => !so.installation && so.status !== 'CANCELLED').length === 0 && (
                <div className="text-[11px] text-gray-700 mt-1">
                  {t('installations.noSoAvailable')}
                </div>
              )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('installations.scheduledAt')}
            </label>
            <input
              type="datetime-local"
              value={createScheduledAt}
              onChange={(e) => setCreateScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('installations.assignTech')}
            </label>
            <select
              value={createTechId}
              onChange={(e) => setCreateTechId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            >
              <option value="">{t('installations.noAssign')}</option>
              {createInstallTechs.data?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {createError && (
            <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">
              {createError}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
