import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import {
  listQuotations,
  createQuotation,
  updateQuotationStatus,
  downloadQuotationPdf,
  listCustomers,
  listProducts,
  type Quotation,
  type QuoteStatus,
  type Product,
} from '../lib/queries';

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  SENT: 'ส่งแล้ว',
  ACCEPTED: 'รับแล้ว',
  REJECTED: 'ปฏิเสธ',
  EXPIRED: 'หมดอายุ',
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-status-info-light text-status-info',
  ACCEPTED: 'bg-status-success-light text-status-success',
  REJECTED: 'bg-brand-red-light text-brand-red',
  EXPIRED: 'bg-gray-200 text-gray-700',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface LineItem {
  productId: string;
  qty: number;
  unitPrice: number;
  discount: number;
}

export default function QuotationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { statusFilter }],
    queryFn: () => listQuotations({ status: statusFilter || undefined, pageSize: 50 }),
  });

  const customers = useQuery({
    queryKey: ['customers', { pageSize: 100 }],
    queryFn: () => listCustomers({ pageSize: 100 }),
    enabled: openCreate,
  });
  const products = useQuery({
    queryKey: ['products', { pageSize: 100 }],
    queryFn: () => listProducts({ pageSize: 100 }),
    enabled: openCreate,
  });

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [formDiscount, setFormDiscount] = useState('0');
  const [vatRate, setVatRate] = useState('7');
  const [validDays, setValidDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerId('');
    setItems([]);
    setFormDiscount('0');
    setVatRate('7');
    setValidDays('30');
    setError(null);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice - it.discount, 0);
    const base = Math.max(0, subtotal - Number(formDiscount || 0));
    const vat = round2(base * (Number(vatRate || 0) / 100));
    const total = round2(base + vat);
    return { subtotal, vat, total };
  }, [items, formDiscount, vatRate]);

  const addItem = (product: Product) => {
    if (items.find((it) => it.productId === product.id)) return;
    setItems([
      ...items,
      { productId: product.id, qty: 1, unitPrice: Number(product.price), discount: 0 },
    ]);
  };

  const createMut = useMutation({
    mutationFn: () =>
      createQuotation({
        customerId,
        items,
        discount: Number(formDiscount),
        vatRate: Number(vatRate),
        validDays: Number(validDays),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setOpenCreate(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้างใบเสนอราคาไม่สำเร็จ';
      setError(msg);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuotationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });

  return (
    <>
      <PageHeader
        title={t('quotations.title')}
        subtitle={t('quotations.subtitle')}
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            ออกใบเสนอราคา
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded text-xs font-semibold ${
              !statusFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'
            }`}
          >
            ทั้งหมด
          </button>
          {(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as QuoteStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-700'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">เลขที่</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">ลูกค้า</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">มูลค่า</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">สถานะ</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">หมดอายุ</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-700">การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-600">กำลังโหลด...</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-600">ยังไม่มีใบเสนอราคา</td>
                </tr>
              )}
              {data?.items.map((q: Quotation) => (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{q.quoteNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{q.customer.name}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ฿{Number(q.total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[q.status]}`}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {new Date(q.validUntil).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadQuotationPdf(q.id, q.quoteNo)}
                        title="ดาวน์โหลด PDF"
                      >
                        <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">
                          picture_as_pdf
                        </span>
                        PDF
                      </Button>
                      {q.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => statusMut.mutate({ id: q.id, status: 'SENT' })}
                        >
                          ส่งให้ลูกค้า
                        </Button>
                      )}
                      {q.status === 'SENT' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => statusMut.mutate({ id: q.id, status: 'ACCEPTED' })}
                          >
                            รับ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMut.mutate({ id: q.id, status: 'REJECTED' })}
                          >
                            ปฏิเสธ
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          resetForm();
        }}
        title="ออกใบเสนอราคาใหม่"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!customerId || items.length === 0 || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังบันทึก...' : `บันทึก (฿${totals.total.toLocaleString()})`}
            </Button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">ลูกค้า *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
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

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">เพิ่มสินค้า</label>
          <select
            onChange={(e) => {
              const p = products.data?.items.find((x) => x.id === e.target.value);
              if (p) addItem(p);
              e.target.value = '';
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            <option value="">— เลือกสินค้าเพื่อเพิ่ม —</option>
            {products.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name} · ฿{Number(p.price).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {items.length > 0 && (
          <div className="mb-3 border border-gray-200 rounded-brand overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold text-gray-600">สินค้า</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 w-16">จำนวน</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-gray-600">ราคา/หน่วย</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const p = products.data?.items.find((x) => x.id === it.productId);
                  return (
                    <tr key={it.productId} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 text-gray-700">{p?.name ?? it.productId}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = { ...it, qty: Number(e.target.value) };
                            setItems(next);
                          }}
                          className="w-14 text-center px-1 py-0.5 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = { ...it, unitPrice: Number(e.target.value) };
                            setItems(next);
                          }}
                          className="w-24 text-right px-1 py-0.5 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="text-brand-red hover:bg-brand-red-light rounded p-0.5"
                          aria-label="ลบรายการ"
                        >
                          <span className="material-symbols-outlined !text-[16px]">close</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Input
            id="q-disc"
            label="ส่วนลดรวม"
            type="number"
            value={formDiscount}
            onChange={(e) => setFormDiscount(e.target.value)}
          />
          <Input
            id="q-vat"
            label="VAT %"
            type="number"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
          <Input
            id="q-vdays"
            label="อายุ (วัน)"
            type="number"
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
          />
        </div>

        <div className="bg-gray-50 rounded-brand p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-700">ยอดรวม</span>
            <span className="font-mono">฿{totals.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">VAT {vatRate}%</span>
            <span className="font-mono">฿{totals.vat.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-sm text-brand-navy">
            <span>ยอดสุทธิ</span>
            <span className="font-mono">฿{totals.total.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
