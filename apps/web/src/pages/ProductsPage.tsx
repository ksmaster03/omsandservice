import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listProducts, createProduct, updateProduct, type Product } from '../lib/queries';
import { useAuth } from '../store/auth';

const BRANDS = ['MAXNUM', 'GORILLA_TECK', 'ANYFIT', 'IMPULSE'] as const;
type Brand = (typeof BRANDS)[number];

const brandLabel: Record<Brand, string> = {
  MAXNUM: 'Maxnum',
  GORILLA_TECK: 'Gorilla Teck',
  ANYFIT: 'AnyFit',
  IMPULSE: 'Impulse',
};

type FormState = {
  sku: string;
  wmsPartNo: string;
  brand: Brand;
  name: string;
  category: string;
  partType: string;
  uom: string;
  standardPack: string;
  price: string;
  warrantyMonths: string;
  pmIntervalMonths: string;
};

const EMPTY_FORM: FormState = {
  sku: '',
  wmsPartNo: '',
  brand: 'MAXNUM',
  name: '',
  category: '',
  partType: '',
  uom: 'EA',
  standardPack: '',
  price: '',
  warrantyMonths: '24',
  pmIntervalMonths: '3',
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<Brand | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, brandFilter, statusFilter, page }],
    queryFn: () =>
      listProducts({
        search: search || undefined,
        brand: brandFilter || undefined,
        active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        page,
        pageSize: 20,
      }),
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        sku: editing.sku,
        wmsPartNo: editing.wmsPartNo ?? '',
        brand: editing.brand,
        name: editing.name,
        category: editing.category,
        partType: editing.partType ?? '',
        uom: editing.uom ?? 'EA',
        standardPack: editing.standardPack ? String(editing.standardPack) : '',
        price: String(editing.price),
        warrantyMonths: String(editing.warrantyMonths),
        pmIntervalMonths: String(editing.pmIntervalMonths),
      });
      setError(null);
    }
  }, [editing]);

  const createMut = useMutation({
    mutationFn: () =>
      createProduct({
        sku: form.sku,
        wmsPartNo: form.wmsPartNo || undefined,
        brand: form.brand,
        name: form.name,
        category: form.category,
        partType: form.partType || undefined,
        uom: form.uom || 'EA',
        standardPack: form.standardPack ? Number(form.standardPack) : undefined,
        price: Number(form.price),
        warrantyMonths: Number(form.warrantyMonths),
        pmIntervalMonths: Number(form.pmIntervalMonths),
      } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('products.createFailed');
      setError(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('no target');
      return updateProduct(editing.id, {
        brand: form.brand,
        name: form.name,
        category: form.category,
        partType: form.partType || undefined,
        uom: form.uom || 'EA',
        standardPack: form.standardPack ? Number(form.standardPack) : undefined,
        wmsPartNo: form.wmsPartNo || undefined,
        price: Number(form.price),
        warrantyMonths: Number(form.warrantyMonths),
        pmIntervalMonths: Number(form.pmIntervalMonths),
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setForm(EMPTY_FORM);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('products.updateFailed');
      setError(msg);
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateProduct(id, { active } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  function closeEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  return (
    <>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitleN', { n: BRANDS.length })}
        action={
          isAdmin && (
            <Button onClick={() => setOpenCreate(true)}>
              <span className="material-symbols-outlined !text-[18px]">add</span>
              {t('products.addButton')}
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
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
              {t('products.allBrands')}
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
          <div className="flex gap-1 bg-gray-100 rounded-brand p-1">
            {(['all', 'active', 'inactive'] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setStatusFilter(k);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  statusFilter === k ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'
                }`}
              >
                {k === 'all' ? t('common.all') : k === 'active' ? t('common.active') : t('common.inactive')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colSku')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colName')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colBrand')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colCategory')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colPrice')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colWarranty')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('products.colPm')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('common.status')}</th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('common.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-gray-400">{t('common.loading')}</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-gray-400">{t('common.noData')}</td>
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
                  <td className="px-4 py-3 text-center text-gray-600">{p.warrantyMonths} {t('products.months')}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.pmIntervalMonths} ด.</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => isAdmin && toggleMut.mutate({ id: p.id, active: !p.active })}
                      disabled={!isAdmin || toggleMut.isPending}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                        p.active
                          ? 'bg-status-success-light text-status-success hover:bg-status-success hover:text-white disabled:hover:bg-status-success-light disabled:hover:text-status-success'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title={isAdmin ? (p.active ? t('customers.toggleActive') : t('customers.toggleInactive')) : 'Admin only'}
                    >
                      <span className="material-symbols-outlined !text-[14px]">
                        {p.active ? 'check_circle' : 'cancel'}
                      </span>
                      {p.active ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="material-symbols-outlined !text-[14px]">edit</span>
                        {t('common.edit')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              <div>
                {t('common.pageOf', { page: data.page, totalPages: data.totalPages, total: data.total })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  {t('common.previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title={t('products.addModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={
                !form.sku || !form.name || !form.category || !form.price || createMut.isPending
              }
            >
              {createMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <ProductForm form={form} setForm={setForm} error={error} isEdit={false} />
      </Modal>

      <Modal
        open={!!editing}
        onClose={closeEdit}
        title={t('products.editModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={
                !form.name || !form.category || !form.price || updateMut.isPending
              }
            >
              {updateMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <ProductForm form={form} setForm={setForm} error={error} isEdit />
      </Modal>
    </>
  );
}

function ProductForm({
  form,
  setForm,
  error,
  isEdit,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
  isEdit: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        id="p-sku"
        label={t('products.fieldSku')}
        placeholder="MX-T9-PRO"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
        disabled={isEdit}
        required
      />
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('products.fieldBrand')}</label>
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
        label={t('products.fieldName')}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="p-cat"
          label={t('products.fieldCategory')}
          placeholder="Treadmill, Bike"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <Input
          id="p-type"
          label="Part Type"
          placeholder="Motor, Strength Machine"
          value={form.partType}
          onChange={(e) => setForm({ ...form, partType: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          id="p-price"
          label={t('products.fieldPrice')}
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          id="p-uom"
          label="UoM"
          placeholder="EA"
          value={form.uom}
          onChange={(e) => setForm({ ...form, uom: e.target.value })}
        />
        <Input
          id="p-pack"
          label="Std Pack"
          type="number"
          value={form.standardPack}
          onChange={(e) => setForm({ ...form, standardPack: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="p-war"
          label={t('products.fieldWarranty')}
          type="number"
          value={form.warrantyMonths}
          onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
        />
        <Input
          id="p-pm"
          label={t('products.fieldPm')}
          type="number"
          value={form.pmIntervalMonths}
          onChange={(e) => setForm({ ...form, pmIntervalMonths: e.target.value })}
        />
      </div>
      <div className="border-t border-gray-200 pt-3 mt-1">
        <div className="text-[10px] text-gray-400 mb-2 font-semibold uppercase">WMS Integration</div>
        <Input
          id="p-wms"
          label="WMS Part No"
          placeholder="รหัสสินค้าฝั่ง WMS (ถ้าต่างจาก SKU)"
          value={form.wmsPartNo}
          onChange={(e) => setForm({ ...form, wmsPartNo: e.target.value })}
        />
      </div>
      {error && (
        <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
      )}
    </>
  );
}
