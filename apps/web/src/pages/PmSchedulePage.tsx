import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listPmSchedules, assignPm, completePm, listUsers, type PmScheduleItem } from '../lib/queries';
import { downloadIcs, type IcsEvent } from '../lib/ics';

const STATUS_COLOR: Record<PmScheduleItem['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-status-info-light text-status-info',
  COMPLETED: 'bg-status-success-light text-status-success',
  OVERDUE: 'bg-brand-red-light text-brand-red',
  SKIPPED: 'bg-gray-200 text-gray-500',
};

const STATUS_LABEL: Record<PmScheduleItem['status'], string> = {
  PENDING: 'รอมอบหมาย',
  SCHEDULED: 'นัดหมายแล้ว',
  COMPLETED: 'เสร็จสิ้น',
  OVERDUE: 'เลยกำหนด',
  SKIPPED: 'ข้าม',
};

export default function PmSchedulePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [completeModal, setCompleteModal] = useState<PmScheduleItem | null>(null);
  const [completeNote, setCompleteNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pm-schedules', { showUpcoming }],
    queryFn: () => listPmSchedules({ upcoming: showUpcoming || undefined, pageSize: 100 }),
  });

  const serviceTechs = useQuery({
    queryKey: ['users', 'service'],
    queryFn: () => listUsers({ role: 'SERVICE', pageSize: 100 }),
  });

  const assignMut = useMutation({
    mutationFn: ({ id, techId }: { id: string; techId: string }) => assignPm(id, techId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-schedules'] }),
  });

  const completeMut = useMutation({
    mutationFn: () => completePm(completeModal!.id, completeNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-schedules'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      setCompleteModal(null);
      setCompleteNote('');
    },
  });

  return (
    <>
      <PageHeader
        title={t('pmSchedules.title')}
        subtitle={t('pmSchedules.subtitle')}
        action={
          <Button
            variant="outline"
            onClick={() => {
              const items = data?.items;
              if (!items?.length) return;
              const events: IcsEvent[] = items
                .filter((pm: PmScheduleItem) => pm.status !== 'COMPLETED' && pm.status !== 'SKIPPED')
                .map((pm: PmScheduleItem) => ({
                  uid: `pm-${pm.id}@toptier-osm`,
                  title: `PM: ${pm.asset.product.name} — ${pm.asset.customer.name}`,
                  description: `S/N: ${pm.asset.serialNo}${pm.tech ? `\nช่าง: ${pm.tech.name}` : ''}`,
                  start: new Date(pm.scheduledAt),
                  allDay: true,
                }));
              downloadIcs(events, 'pm-schedules.ics');
            }}
          >
            <span className="material-symbols-outlined !text-[18px]">download</span>
            .ics
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit">
          <button
            onClick={() => setShowUpcoming(true)}
            className={`px-3 py-1 rounded text-xs font-semibold ${showUpcoming ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
          >
            ถึงกำหนดใน 30 วัน
          </button>
          <button
            onClick={() => setShowUpcoming(false)}
            className={`px-3 py-1 rounded text-xs font-semibold ${!showUpcoming ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
          >
            ทั้งหมด
          </button>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">กำหนด</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ลูกค้า / เครื่อง</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ช่าง</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">กำลังโหลด...</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">ไม่มีงาน PM ในช่วงนี้</td>
                </tr>
              )}
              {data?.items.map((pm: PmScheduleItem) => {
                const daysLeft = Math.ceil(
                  (new Date(pm.scheduledAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
                );
                const isOverdue = daysLeft < 0 && pm.status !== 'COMPLETED';
                return (
                  <tr key={pm.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-gray-900">
                        {new Date(pm.scheduledAt).toLocaleDateString('th-TH')}
                      </div>
                      <div className={`text-[10px] ${isOverdue ? 'text-brand-red font-bold' : 'text-gray-500'}`}>
                        {daysLeft >= 0 ? `อีก ${daysLeft} วัน` : `เลย ${Math.abs(daysLeft)} วัน`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">{pm.asset.customer.name}</div>
                      <div className="text-xs text-gray-500">
                        {pm.asset.product.name} · <span className="font-mono">{pm.asset.serialNo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {pm.tech ? (
                        pm.tech.name
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) assignMut.mutate({ id: pm.id, techId: e.target.value });
                          }}
                          className="text-[11px] border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">— มอบหมาย —</option>
                          {serviceTechs.data?.items.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[pm.status]}`}>
                        {STATUS_LABEL[pm.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pm.status !== 'COMPLETED' && (
                        <Button size="sm" onClick={() => setCompleteModal(pm)}>
                          ปิดงาน
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!completeModal}
        onClose={() => setCompleteModal(null)}
        title="ปิดงาน PM"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteModal(null)}>
              ยกเลิก
            </Button>
            <Button onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
              {completeMut.isPending ? 'กำลังบันทึก...' : 'ยืนยันปิดงาน'}
            </Button>
          </>
        }
      >
        {completeModal && (
          <>
            <p className="text-xs text-gray-500 mb-3">
              ปิดงาน PM ของ <strong>{completeModal.asset.customer.name}</strong> · {completeModal.asset.product.name}
              <br />ระบบจะสร้าง PM รอบถัดไปอัตโนมัติ ({completeModal.asset.product.pmIntervalMonths} เดือนจากวันนี้)
            </p>
            <Input
              id="pm-note"
              label="บันทึกสิ่งที่ทำ"
              placeholder="เช่น ทำความสะอาดสายพาน, หยอดน้ำมันลูกปืน"
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
            />
          </>
        )}
      </Modal>
    </>
  );
}
