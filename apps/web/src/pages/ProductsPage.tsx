import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listProducts, createProduct } from '../lib/queries';
import { useAuth } from '../store/auth';

const BRANDS = ['MAXNUM', 'GORILLA_TECK', 'ANYFIT', 'IMPULSE'] as const;
type Brand = (typeof BRANDS)[number];

const brandLabel: Record<Brand, string> = {
  MAXNUM: 'Maxnum',
  GORILLA_TECK: 'Gorilla Teck',
  ANYFIT: 'AnyFit',
  IMPULSE: 'Impulse',
};

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<Brand | ''>('');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, brandFilter, page }],
    queryFn: () =>
      listProducts({
        search: search || undefined,
        brand: brandFilter || undefined,
        page,
        pageSize: 20,
      }),
  });

  const [form, setForm] = useState({
    sku: '',
    brand: 'MAXNUM' as Brand,
    name: '',
    category: '',
    price: '',
    warrantyMonths: '24',
    pmIntervalMonths: '3',
  });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createProduct({
        sku: form.sku,
        brand: form.brand,
        name: form.name,
        category: form.category,
        price: Number(form.price),
        warrantyMonths: Number(form.warrantyMonths),
        pmIntervalMonths: Number(form.pmIntervalMonths),
      } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpenCreate(false);
      setForm({ sku: '', brand: 'MAXNUM', name: '', category: '', price: '', warrantyMonths: '24', pmIntervalMonths: '3' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้างสินค้าไม่สำเร็จ';
      setError(msg);
    },
  });

  return (
    <>
      <PageHeader
        title="สินค้า"
        subtitle={`คลังสินค้า ${BRANDS.length} แบรนด์`}
        action={
          isAdmin && (
            <Button onClick={() => setOpenCreate(true)}>
              <span className="material-symbols-outlined !text-[18px]">add</span>
              เพิ่มสินค้า
            </Button>
          )
        }
      />

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ / SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-brand p-1">
            <button
              onClick={() => {
                setBrandFilter('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                !brandFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'
              }`}
            >
              ทั้งหมด
            </button>
            {BRANDS.map((b) => (
              <button
                key={b}
                onClick={() => {
                  setBrandFilter(b);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  brandFilter === b ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'
                }`}
              >
                {brandLabel[b]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">SKU</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ชื่อ</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">แบรนด์</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">หมวด</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ราคา</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ประกัน</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">PM</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">กำลังโหลด...</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">ไม่มีสินค้า</td>
                </tr>
              )}
              {data?.items.map((p) => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">{brandLabel[p.brand]}</td>
                  <td className="px-4 py-3 text-gray-700">{p.category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                    ฿{Number(p.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.warrantyMonths} ด.</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.pmIntervalMonths} ด.</td>
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
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ก่อนหน้า
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
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
        title="เพิ่มสินค้าใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={
                !form.sku || !form.name || !form.category || !form.price || createMut.isPending
              }
            >
              {createMut.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </>
        }
      >
        <Input
          id="p-sku"
          label="SKU * (ตัวพิมพ์ใหญ่ + ขีด)"
          placeholder="เช่น MX-T9-PRO"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
          required
        />
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">แบรนด์ *</label>
          <select
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value as Brand })}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
          >
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {brandLabel[b]}
              </option>
            ))}
          </select>
        </div>
        <Input
          id="p-name"
          label="ชื่อสินค้า *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          id="p-cat"
          label="หมวดหมู่ *"
          placeholder="เช่น Treadmill, Bike"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <Input
          id="p-price"
          label="ราคา *"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="p-war"
            label="ประกัน (เดือน)"
            type="number"
            value={form.warrantyMonths}
            onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
          />
          <Input
            id="p-pm"
            label="PM (เดือน)"
            type="number"
            value={form.pmIntervalMonths}
            onChange={(e) => setForm({ ...form, pmIntervalMonths: e.target.value })}
          />
        </div>
        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
