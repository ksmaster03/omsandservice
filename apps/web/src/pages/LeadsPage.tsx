import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
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

// ── Draggable lead card ────────────────────────────────────────
function LeadCard({ lead, onMoveNext }: { lead: Lead; onMoveNext: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { stage: lead.stage },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0 : 1,
      }
    : { opacity: isDragging ? 0 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-brand p-2.5 hover:shadow-brand-md transition-shadow cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="text-[11.5px] font-semibold text-gray-900 truncate">{lead.customer.name}</div>
      <div className="text-[10px] text-brand-navy font-mono mt-0.5">
        ฿{Number(lead.value).toLocaleString()}
      </div>
      {lead.note && <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{lead.note}</div>}
      {onMoveNext && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onMoveNext();
          }}
          className="mt-2 w-full text-[10px] font-semibold text-brand-red hover:bg-brand-red-light rounded px-2 py-1 transition-colors"
        >
          → Next
        </button>
      )}
    </div>
  );
}

// ── Droppable column ───────────────────────────────────────────
function StageColumn({ stage, items, onMoveNext }: { stage: LeadStage; items: Lead[]; onMoveNext: (id: string, to: LeadStage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const stageTotal = items.reduce((s, l) => s + Number(l.value), 0);
  const idx = STAGES.indexOf(stage);
  const next = idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 rounded-brand-lg border border-gray-200 border-t-4 ${stageAccent[stage]} overflow-hidden transition-colors ${
        isOver ? 'bg-brand-red-light border-brand-red' : ''
      }`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-brand-navy">{stageLabel[stage]}</div>
          <div className="text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {items.length}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">฿{stageTotal.toLocaleString()}</div>
      </div>

      <div className="p-2 space-y-2 min-h-[300px] max-h-[600px] overflow-y-auto">
        {items.length === 0 && (
          <div className="text-[11px] text-gray-300 text-center py-6">ลากการ์ดมาวางตรงนี้</div>
        )}
        {items.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onMoveNext={next ? () => onMoveNext(lead.id, next) : () => undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

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
    onMutate: async ({ id, stage }) => {
      // Optimistic update — move card to new column immediately
      await qc.cancelQueries({ queryKey: ['leads-pipeline'] });
      const prev = qc.getQueryData<Record<string, Lead[]>>(['leads-pipeline']);
      if (prev) {
        const next: Record<string, Lead[]> = {};
        let moved: Lead | undefined;
        for (const [s, items] of Object.entries(prev)) {
          next[s] = items.filter((l) => {
            if (l.id === id) {
              moved = l;
              return false;
            }
            return true;
          });
        }
        if (moved) {
          (next[stage] ??= []).unshift({ ...moved, stage });
        }
        qc.setQueryData(['leads-pipeline'], next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['leads-pipeline'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads-pipeline'] }),
  });

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    const all: Lead[] = Object.values(data ?? {}).flat();
    const found = all.find((l) => l.id === id);
    setActiveLead(found ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    if (!e.over) return;
    const leadId = e.active.id as string;
    const targetStage = e.over.id as LeadStage;
    const currentStage = (e.active.data.current?.stage as LeadStage) ?? null;
    if (!currentStage || currentStage === targetStage) return;
    moveStageMut.mutate({ id: leadId, stage: targetStage });
  }

  return (
    <>
      <PageHeader
        title="Sales Pipeline"
        subtitle="ลากการ์ดเพื่อเปลี่ยนสถานะ — หรือกด → Next"
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
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-5 gap-3 min-w-[1000px]">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  items={data?.[stage] ?? []}
                  onMoveNext={(id, to) => moveStageMut.mutate({ id, stage: to })}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead && (
                <div className="bg-white border-2 border-brand-red rounded-brand p-2.5 shadow-brand-lg rotate-2 w-[190px]">
                  <div className="text-[11.5px] font-semibold text-gray-900 truncate">
                    {activeLead.customer.name}
                  </div>
                  <div className="text-[10px] text-brand-navy font-mono mt-0.5">
                    ฿{Number(activeLead.value).toLocaleString()}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
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
