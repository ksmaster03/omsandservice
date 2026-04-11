import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import {
  getLeadPipeline,
  createLead,
  updateLeadStage,
  listCustomers,
  type Lead,
  type LeadStage,
} from '../lib/queries';

const STAGES: LeadStage[] = ['LEAD', 'QUALIFIED', 'DEMO', 'QUOTE', 'NEGOTIATION'];

const stageLabel: Record<LeadStage, string> = {
  LEAD: 'Lead ใหม่',
  QUALIFIED: 'คัดกรอง',
  DEMO: 'Demo',
  QUOTE: 'ใบเสนอราคา',
  NEGOTIATION: 'ต่อรอง',
  WON: 'ปิดการขาย',
  LOST: 'ยกเลิก',
};

const stageAccent: Record<LeadStage, string> = {
  LEAD: 'border-t-gray-400',
  QUALIFIED: 'border-t-status-info',
  DEMO: 'border-t-status-warning',
  QUOTE: 'border-t-brand-gold',
  NEGOTIATION: 'border-t-brand-red',
  WON: 'border-t-status-success',
  LOST: 'border-t-gray-300',
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn: getLeadPipeline,
  });

  const customers = useQuery({
    queryKey: ['customers', { pageSize: 100 }],
    queryFn: () => listCustomers({ pageSize: 100 }),
    enabled: openCreate,
  });

  const [form, setForm] = useState({ customerId: '', value: '', note: '' });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createLead({
        customerId: form.customerId,
        value: Number(form.value),
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads-pipeline'] });
      setOpenCreate(false);
      setForm({ customerId: '', value: '', note: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้าง lead ไม่สำเร็จ';
      setError(msg);
    },
  });

  const moveStageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => updateLeadStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads-pipeline'] }),
  });

  function nextStage(current: LeadStage): LeadStage | null {
    const idx = STAGES.indexOf(current);
    return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1]! : null;
  }

  return (
    <>
      <PageHeader
        title="Sales Pipeline"
        subtitle="ภาพรวม lead ทั้งหมดแยกตามสถานะ"
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            เพิ่ม Lead
          </Button>
        }
      />

      <div className="p-6 overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
        ) : (
          <div className="grid grid-cols-5 gap-3 min-w-[1000px]">
            {STAGES.map((stage) => {
              const items: Lead[] = data?.[stage] ?? [];
              const stageTotal = items.reduce((s, l) => s + Number(l.value), 0);
              return (
                <div key={stage} className={`bg-white rounded-brand-lg border border-gray-200 border-t-4 ${stageAccent[stage]} overflow-hidden`}>
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-brand-navy">{stageLabel[stage]}</div>
                      <div className="text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {items.length}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      ฿{stageTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                    {items.length === 0 && (
                      <div className="text-[11px] text-gray-300 text-center py-6">— ไม่มีรายการ —</div>
                    )}
                    {items.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-gray-50 border border-gray-200 rounded-brand p-2.5 hover:shadow-brand-sm transition-shadow"
                      >
                        <div className="text-[11.5px] font-semibold text-gray-900 truncate">
                          {lead.customer.name}
                        </div>
                        <div className="text-[10px] text-brand-navy font-mono mt-0.5">
                          ฿{Number(lead.value).toLocaleString()}
                        </div>
                        {lead.note && (
                          <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{lead.note}</div>
                        )}
                        {nextStage(stage) && (
                          <button
                            onClick={() =>
                              moveStageMut.mutate({ id: lead.id, stage: nextStage(stage)! })
                            }
                            className="mt-2 w-full text-[10px] font-semibold text-brand-red hover:bg-brand-red-light rounded px-2 py-1 transition-colors flex items-center justify-center gap-1"
                          >
                            → {stageLabel[nextStage(stage)!]}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="เพิ่ม Lead ใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.customerId || !form.value || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังสร้าง...' : 'บันทึก'}
            </Button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">ลูกค้า *</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">— เลือกลูกค้า —</option>
            {customers.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          id="lead-val"
          label="มูลค่าที่คาดหวัง (บาท) *"
          type="number"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          required
        />
        <Input
          id="lead-note"
          label="หมายเหตุ"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
