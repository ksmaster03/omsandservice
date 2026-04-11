import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
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

const STATUS_LABEL: Record<SOStatus, string> = {
  PENDING: 'รอดำเนินการ',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PRODUCTION: 'กำลังผลิต',
  READY_TO_DELIVER: 'พร้อมส่งมอบ',
  INSTALLED: 'ติดตั้งแล้ว',
  COMPLETED: 'เสร็จสมบูรณ์',
  CANCELLED: 'ยกเลิก',
};

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
  PENDING: 'bg-gray-100 text-gray-500',
  DUE: 'bg-status-warning-light text-brand-gold-text',
  PAID: 'bg-status-success-light text-status-success',
  OVERDUE: 'bg-brand-red-light text-brand-red',
};

export default function SalesOrdersPage() {
  const qc = useQueryClient();
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
        title="Sales Orders"
        subtitle="คำสั่งซื้อและการชำระเงิน"
        action={
          <Button onClick={() => setOpenConvert(true)}>
            <span className="material-symbols-outlined !text-[18px]">transform</span>
            แปลงจากใบเสนอราคา
          </Button>
        }
      />

      <div className="p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">เลขที่</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ลูกค้า</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">มูลค่า</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">การชำระเงิน</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">กำลังโหลด...</td>
                </tr>
              )}
              {!isLoading && list?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">ยังไม่มี Sales Order</td>
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
                      ดูรายละเอียด
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
        title={detail.data?.soNo ?? 'Sales Order'}
      >
        {detail.isLoading && <div className="text-gray-400 text-sm py-4">กำลังโหลด...</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs text-gray-600">
              <div>ลูกค้า: <span className="font-semibold text-gray-900">{detail.data.customer.name}</span></div>
              <div>
                สถานะ:{' '}
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[detail.data.status]}`}>
                  {STATUS_LABEL[detail.data.status]}
                </span>
              </div>
              <div>ยอดรวม: <span className="font-semibold">฿{Number(detail.data.total).toLocaleString()}</span></div>
              {detail.data.quotation && (
                <div>อ้างอิงใบเสนอราคา: <span className="font-mono">{detail.data.quotation.quoteNo}</span></div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">รายการสินค้า</div>
              <div className="border border-gray-200 rounded-brand overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">สินค้า</th>
                      <th className="text-center px-2 py-1.5 font-semibold text-gray-600">จำนวน</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-gray-600">ราคา/หน่วย</th>
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
              <div className="text-xs font-bold text-gray-700 mb-2">การชำระเงิน (Milestones)</div>
              <div className="space-y-1.5">
                {detail.data.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-50 rounded-brand px-3 py-2 border border-gray-200"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-900">{m.label}</div>
                      <div className="text-[10px] text-gray-500">
                        กำหนด {new Date(m.dueDate).toLocaleDateString('th-TH')}
                        {m.paidAt && ` · ชำระ ${new Date(m.paidAt).toLocaleDateString('th-TH')}`}
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
                          Mark Paid
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
        title="สร้าง Sales Order จากใบเสนอราคา"
      >
        <p className="text-xs text-gray-500 mb-3">
          แสดงเฉพาะใบเสนอราคาที่สถานะ <strong>ACCEPTED</strong> เท่านั้น เลือกรูปแบบชำระเงินที่ต้องการ
        </p>
        {acceptedQuotes.isLoading && <div className="text-gray-400 text-sm">กำลังโหลด...</div>}
        {acceptedQuotes.data?.items.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-xs">
            ไม่มีใบเสนอราคาที่พร้อมแปลง
          </div>
        )}
        <div className="space-y-2">
          {acceptedQuotes.data?.items.map((q) => (
            <div key={q.id} className="border border-gray-200 rounded-brand p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-mono text-xs font-bold text-brand-navy">{q.quoteNo}</div>
                  <div className="text-sm font-semibold">{q.customer.name}</div>
                  <div className="text-xs text-gray-500">฿{Number(q.total).toLocaleString()}</div>
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
                    {tpl === '30_30_40' ? '30/30/40' : tpl === '50_50' ? '50/50' : 'เต็มจำนวน'}
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
