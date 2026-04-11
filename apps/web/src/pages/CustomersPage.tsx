import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listCustomers, createCustomer } from '../lib/queries';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => listCustomers({ search: search || undefined, page, pageSize: 20 }),
  });

  const [form, setForm] = useState({
    name: '',
    taxId: '',
    type: 'CORPORATE' as 'CORPORATE' | 'INDIVIDUAL',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== ''),
      );
      return createCustomer(payload as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setOpenCreate(false);
      setForm({ name: '', taxId: '', type: 'CORPORATE', contactName: '', phone: '', email: '', address: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้างลูกค้าไม่สำเร็จ';
      setError(msg);
    },
  });

  return (
    <>
      <PageHeader
        title="ลูกค้า"
        subtitle="จัดการข้อมูลลูกค้าทั้งหมด"
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            เพิ่มลูกค้า
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ / เบอร์ / อีเมล / เลขภาษี"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ชื่อลูกค้า</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ประเภท</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ผู้ติดต่อ</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">เบอร์</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">อีเมล</th>
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
                  <td colSpan={5} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td>
                </tr>
              )}
              {data?.items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.type === 'CORPORATE'
                          ? 'bg-status-info-light text-status-info'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.type === 'CORPORATE' ? 'นิติบุคคล' : 'บุคคล'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.contactName || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.phone || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.email || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              <div>
                หน้า {data.page} / {data.totalPages} · ทั้งหมด {data.total} รายการ
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="เพิ่มลูกค้าใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.name || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </>
        }
      >
        <Input
          id="c-name"
          label="ชื่อลูกค้า *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภท</label>
          <div className="flex gap-2">
            {(['CORPORATE', 'INDIVIDUAL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2 rounded-brand text-xs font-semibold border ${
                  form.type === t
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {t === 'CORPORATE' ? 'นิติบุคคล' : 'บุคคล'}
              </button>
            ))}
          </div>
        </div>
        <Input
          id="c-tax"
          label="เลขผู้เสียภาษี"
          value={form.taxId}
          onChange={(e) => setForm({ ...form, taxId: e.target.value })}
        />
        <Input
          id="c-contact"
          label="ชื่อผู้ติดต่อ"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
        />
        <Input
          id="c-phone"
          label="เบอร์โทร"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          id="c-email"
          label="อีเมล"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          id="c-address"
          label="ที่อยู่"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
