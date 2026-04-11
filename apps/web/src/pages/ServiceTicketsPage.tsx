import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
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

const STAGES: TicketStage[] = ['RECEIVED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'REPAIRING', 'CLOSED'];

const STAGE_LABEL: Record<TicketStage, string> = {
  RECEIVED: 'รับแจ้ง',
  ASSIGNED: 'มอบหมาย',
  EN_ROUTE: 'เดินทาง',
  ARRIVED: 'ถึงหน้างาน',
  REPAIRING: 'กำลังซ่อม',
  CLOSED: 'ปิดงาน',
  CANCELLED: 'ยกเลิก',
};

const PROBLEM_LABEL: Record<ServiceTicket['problemType'], string> = {
  BELT: 'สายพาน',
  NOISE: 'เสียงดัง',
  CONSOLE: 'Console',
  MOTOR: 'มอเตอร์',
  POWER: 'ไฟ/ไม่เปิดติด',
  OTHER: 'อื่นๆ',
};

const PRIORITY_COLOR: Record<ServiceTicket['priority'], string> = {
  URGENT: 'bg-brand-red text-white',
  NORMAL: 'bg-status-warning text-brand-navy',
  LOW: 'bg-status-success text-white',
};

const PRIORITY_LABEL: Record<ServiceTicket['priority'], string> = {
  URGENT: 'เร่งด่วน',
  NORMAL: 'ปกติ',
  LOW: 'ไม่เร่ง',
};

export default function ServiceTicketsPage() {
  const qc = useQueryClient();
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
        'สร้าง ticket ไม่สำเร็จ';
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

  function nextStage(s: TicketStage): TicketStage | null {
    const i = STAGES.indexOf(s);
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1]! : null;
  }

  return (
    <>
      <PageHeader
        title="Service Tickets"
        subtitle="แจ้งซ่อมและติดตามงาน"
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            แจ้งซ่อมใหม่
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit flex-wrap">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1 rounded text-xs font-semibold ${!stageFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
          >
            ทั้งหมด
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold ${stageFilter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">เลขที่</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ลูกค้า / เครื่อง</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ปัญหา</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ความเร่งด่วน</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>
              )}
              {!list.isLoading && list.data?.items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">ยังไม่มี ticket</td></tr>
              )}
              {list.data?.items.map((t: ServiceTicket) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{t.ticketNo}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{t.customer.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{t.asset.serialNo}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="font-semibold">{PROBLEM_LABEL[t.problemType]}</div>
                    <div className="text-[10px] text-gray-500 line-clamp-1">{t.description}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLOR[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                      {STAGE_LABEL[t.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(t.id)}>
                      ดูรายละเอียด
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
        title={detail.data?.ticketNo ?? 'Service Ticket'}
      >
        {detail.isLoading && <div className="text-gray-400 text-sm py-4">กำลังโหลด...</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs">
              <div><strong>ลูกค้า:</strong> {detail.data.customer.name}</div>
              <div><strong>เครื่อง:</strong> {detail.data.asset.product.name} (<span className="font-mono">{detail.data.asset.serialNo}</span>)</div>
              <div><strong>ปัญหา:</strong> {PROBLEM_LABEL[detail.data.problemType]} — <span className={`ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLOR[detail.data.priority]}`}>{PRIORITY_LABEL[detail.data.priority]}</span></div>
              <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">{detail.data.description}</div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">Timeline</div>
              <div className="space-y-1.5">
                {detail.data.events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-brand-red mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{STAGE_LABEL[e.stage]}</div>
                      {e.note && <div className="text-gray-500 text-[11px]">{e.note}</div>}
                      <div className="text-[10px] text-gray-400">
                        {new Date(e.createdAt).toLocaleString('th-TH')}
                        {e.actor && ` · ${e.actor.name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detail.data.stage !== 'CLOSED' && nextStage(detail.data.stage) && (
              <div className="pt-2 border-t border-gray-200">
                <Button
                  onClick={() => stageMut.mutate({ id: detail.data!.id, stage: nextStage(detail.data!.stage)! })}
                  disabled={stageMut.isPending}
                >
                  → {STAGE_LABEL[nextStage(detail.data.stage)!]}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="แจ้งซ่อมใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>ยกเลิก</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.customerId || !form.assetId || !form.description || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังบันทึก...' : 'สร้าง ticket'}
            </Button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">ลูกค้า *</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, assetId: '' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">— เลือกลูกค้า —</option>
            {customers.data?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">เครื่อง *</label>
          <select
            value={form.assetId}
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
            disabled={!form.customerId}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy disabled:bg-gray-100"
          >
            <option value="">— เลือกเครื่อง —</option>
            {customerAssets.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.product.name} · {a.serialNo}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภทปัญหา *</label>
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">ความเร่งด่วน *</label>
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">อธิบายปัญหา *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          />
        </div>

        <Input
          id="t-loc"
          label="ตำแหน่งเพิ่มเติม"
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
