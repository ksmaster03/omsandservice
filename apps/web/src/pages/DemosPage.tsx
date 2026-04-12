import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listDemos, createDemo, listLeads, listProducts, type Demo } from '../lib/queries';
import { downloadIcs, type IcsEvent } from '../lib/ics';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const statusColor: Record<Demo['status'], string> = {
  SCHEDULED: 'bg-status-info text-white',
  COMPLETED: 'bg-status-success text-white',
  CANCELLED: 'bg-gray-400 text-white',
  NO_SHOW: 'bg-brand-red text-white',
};

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}
function endOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0, 23, 59, 59, 999);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DemosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const from = startOfMonth(cursor.year, cursor.month);
  const to = endOfMonth(cursor.year, cursor.month);

  const { data: demos, isLoading } = useQuery({
    queryKey: ['demos', cursor.year, cursor.month],
    queryFn: () => listDemos({ from: from.toISOString(), to: to.toISOString() }),
  });

  const leads = useQuery({
    queryKey: ['leads', { pageSize: 100 }],
    queryFn: () => listLeads({ pageSize: 100 }),
    enabled: openCreate,
  });
  const products = useQuery({
    queryKey: ['products', { pageSize: 100 }],
    queryFn: () => listProducts({ pageSize: 100 }),
    enabled: openCreate,
  });

  const [form, setForm] = useState({ leadId: '', productId: '', scheduledAt: '', note: '', location: '', address: '', contactName: '', contactPhone: '' });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createDemo({
        leadId: form.leadId,
        productId: form.productId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        note: form.note || undefined,
        location: form.location || undefined,
        address: form.address || undefined,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demos'] });
      setOpenCreate(false);
      setForm({ leadId: '', productId: '', scheduledAt: '', note: '', location: '', address: '', contactName: '', contactPhone: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้าง demo ไม่สำเร็จ';
      setError(msg);
    },
  });

  // Build calendar grid: always 6 weeks = 42 cells for consistent layout
  const grid = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday
    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    const startDate = new Date(firstDay);
    startDate.setDate(1 - startOffset);
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.month });
    }
    return cells;
  }, [cursor.year, cursor.month]);

  const demosByDay = useMemo(() => {
    const map = new Map<string, Demo[]>();
    for (const d of demos ?? []) {
      const dt = new Date(d.scheduledAt);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [demos]);

  const selectedDemos = selectedDay
    ? demosByDay.get(`${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`) ?? []
    : [];

  function prevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  }
  function nextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  }
  function goToday() {
    const t = new Date();
    setCursor({ year: t.getFullYear(), month: t.getMonth() });
    setSelectedDay(t);
  }

  return (
    <>
      <PageHeader
        title={t('demos.title')}
        subtitle={t('demos.subtitle')}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!demos?.length) return;
                const events: IcsEvent[] = demos.map((d) => ({
                  uid: `demo-${d.id}@toptier-osm`,
                  title: `Demo: ${d.product.name} — ${d.lead.customer.name}`,
                  description: d.note ?? undefined,
                  start: new Date(d.scheduledAt),
                }));
                downloadIcs(events, `demos-${cursor.year}${String(cursor.month + 1).padStart(2, '0')}.ics`);
              }}
            >
              <span className="material-symbols-outlined !text-[18px]">download</span>
              .ics
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <span className="material-symbols-outlined !text-[18px]">add</span>
              {t('demos.addButton')}
            </Button>
          </div>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar */}
        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="font-display font-bold text-lg text-brand-navy">
              {THAI_MONTHS[cursor.month]} {cursor.year + 543}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} aria-label="เดือนก่อนหน้า">
                <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">chevron_left</span>
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>วันนี้</Button>
              <Button variant="outline" size="sm" onClick={nextMonth} aria-label="เดือนถัดไป">
                <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">chevron_right</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {DAY_HEADERS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-bold py-2 uppercase tracking-wider ${
                  i === 0 || i === 6 ? 'text-brand-red' : 'text-gray-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {isLoading && (
              <div className="col-span-7 text-center py-8 text-gray-400">กำลังโหลด...</div>
            )}
            {!isLoading &&
              grid.map((cell, i) => {
                const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
                const items = demosByDay.get(key) ?? [];
                const isToday = sameDay(cell.date, new Date());
                const isSelected = selectedDay && sameDay(cell.date, selectedDay);
                const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelectedDay(cell.date)}
                    className={`min-h-[85px] border-r border-b border-gray-100 p-1.5 text-left transition-colors ${
                      cell.inMonth ? '' : 'bg-gray-50 text-gray-300'
                    } ${isSelected ? 'bg-brand-red-light ring-2 ring-inset ring-brand-red' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`text-[11px] font-bold ${isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-red text-white' : isWeekend && cell.inMonth ? 'text-brand-red' : ''}`}>
                      {cell.date.getDate()}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((d) => (
                        <div
                          key={d.id}
                          className={`text-[9px] font-semibold truncate rounded px-1 py-0.5 ${statusColor[d.status]}`}
                          title={`${d.lead.customer.name} • ${d.product.name}`}
                        >
                          {new Date(d.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {d.lead.customer.name}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-[9px] text-gray-500">+{items.length - 3} อีก</div>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="font-display font-bold text-sm text-brand-navy">
              {selectedDay
                ? selectedDay.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'เลือกวัน'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {selectedDemos.length > 0
                ? `${selectedDemos.length} นัดหมาย`
                : 'ไม่มีนัดหมาย'}
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
            {!selectedDay && (
              <div className="text-xs text-gray-400 text-center py-8">
                คลิกวันบนปฏิทินเพื่อดูรายละเอียด
              </div>
            )}
            {selectedDay && selectedDemos.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-8">ไม่มีนัดหมายในวันนี้</div>
            )}
            {selectedDemos.map((d) => (
              <div key={d.id} className="border border-gray-200 rounded-brand p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[d.status]}`}>
                    {d.status}
                  </span>
                  <span className="text-[11px] font-mono text-gray-600">
                    {new Date(d.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900">{d.lead.customer.name}</div>
                <div className="text-xs text-gray-600">{d.product.name}</div>
                {d.location && (
                  <div className="text-[11px] text-gray-700 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[13px] text-gray-400">location_on</span>
                    {d.location}
                  </div>
                )}
                {d.address && (
                  <div className="text-[10px] text-gray-500 ml-4">{d.address}</div>
                )}
                {(d.contactName || d.contactPhone || d.lead.customer.phone) && (
                  <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[13px] text-gray-400">person</span>
                    {d.contactName ?? d.lead.customer.name}
                    {(d.contactPhone ?? d.lead.customer.phone) && (
                      <a href={`tel:${d.contactPhone ?? d.lead.customer.phone}`} className="text-brand-red font-mono ml-1">
                        ☎ {d.contactPhone ?? d.lead.customer.phone}
                      </a>
                    )}
                  </div>
                )}
                {d.note && <div className="text-[11px] text-gray-500 mt-1 bg-gray-50 rounded p-1.5">{d.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="นัดหมาย Demo ใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.leadId || !form.productId || !form.scheduledAt || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังสร้าง...' : 'บันทึก'}
            </Button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Lead *</label>
          <select
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">— เลือก Lead —</option>
            {leads.data?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.customer.name} · {l.stage} · ฿{Number(l.value).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">สินค้าที่จะ demo *</label>
          <select
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">— เลือกสินค้า —</option>
            {products.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          id="demo-at"
          label="วันเวลานัดหมาย *"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          required
        />
        <div className="border-t border-gray-200 pt-3 mt-1">
          <div className="text-[10px] text-gray-400 mb-2 font-semibold uppercase">สถานที่ + ข้อมูลติดต่อ</div>
          <Input
            id="demo-loc"
            label="สถานที่ Demo"
            placeholder="เช่น สำนักงานลูกค้า, ศูนย์ Fitness"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <Input
            id="demo-addr"
            label="ที่อยู่"
            placeholder="ที่อยู่เต็ม / Google Maps link"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="demo-cname"
              label="ชื่อผู้ติดต่อ"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
            <Input
              id="demo-cphone"
              label="เบอร์ติดต่อ"
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
        </div>
        <Input
          id="demo-note"
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
