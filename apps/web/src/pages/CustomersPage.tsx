import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listCustomers, createCustomer, updateCustomer, type Customer } from '../lib/queries';

type FormState = {
  name: string;
  alternateName: string;
  taxId: string;
  type: 'CORPORATE' | 'INDIVIDUAL';
  contactName: string;
  phone: string;
  email: string;
  address: string;
  alternateAddress: string;
  wmsCode: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  alternateName: '',
  taxId: '',
  type: 'CORPORATE',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  alternateAddress: '',
  wmsCode: '',
};

export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, statusFilter, page }],
    queryFn: () =>
      listCustomers({
        search: search || undefined,
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
        name: editing.name ?? '',
        alternateName: editing.alternateName ?? '',
        taxId: editing.taxId ?? '',
        type: editing.type,
        contactName: editing.contactName ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        address: editing.address ?? '',
        alternateAddress: editing.alternateAddress ?? '',
        wmsCode: editing.wmsCode ?? '',
      });
      setError(null);
    }
  }, [editing]);

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
      setForm(EMPTY_FORM);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('customers.createFailed');
      setError(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('no target');
      const payload: Partial<Customer> = {
        name: form.name,
        alternateName: form.alternateName || null,
        taxId: form.taxId || null,
        type: form.type,
        contactName: form.contactName || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        alternateAddress: form.alternateAddress || null,
        wmsCode: form.wmsCode || null,
      };
      return updateCustomer(editing.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
      setForm(EMPTY_FORM);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('customers.updateFailed');
      setError(msg);
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateCustomer(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  function closeEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">add</span>
            {t('customers.addButton')}
          </Button>
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
              placeholder={t('customers.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
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
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('customers.colName')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('customers.colType')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('customers.colContact')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('customers.colPhone')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('customers.colEmail')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('common.status')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">{t('common.loading')}</td>
                </tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">{t('common.noData')}</td>
                </tr>
              )}
              {data?.items.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${!c.active ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.type === 'CORPORATE'
                          ? 'bg-status-info-light text-status-info'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.type === 'CORPORATE' ? t('customers.typeCorporate') : t('customers.typeIndividual')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.contactName || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.phone || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.email || '–'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleMut.mutate({ id: c.id, active: !c.active })}
                      disabled={toggleMut.isPending}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                        c.active
                          ? 'bg-status-success-light text-status-success hover:bg-status-success hover:text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title={c.active ? t('customers.toggleActive') : t('customers.toggleInactive')}
                    >
                      <span className="material-symbols-outlined !text-[14px]">
                        {c.active ? 'check_circle' : 'cancel'}
                      </span>
                      {c.active ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-300 text-xs text-blue-600 hover:bg-blue-50"
                        title="360° View"
                      >
                        <span className="material-symbols-outlined !text-[14px]">visibility</span>
                        360°
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="material-symbols-outlined !text-[14px]">edit</span>
                      </button>
                    </div>
                  </td>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
        title={t('customers.addModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.name || createMut.isPending}
            >
              {createMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <CustomerForm form={form} setForm={setForm} error={error} />
      </Modal>

      <Modal
        open={!!editing}
        onClose={closeEdit}
        title={t('customers.editModalTitle')}
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={!form.name || updateMut.isPending}
            >
              {updateMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <CustomerForm form={form} setForm={setForm} error={error} />
      </Modal>
    </>
  );
}

function CustomerForm({
  form,
  setForm,
  error,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        id="c-name"
        label={t('customers.fieldName')}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('customers.fieldType')}</label>
        <div className="flex gap-2">
          {(['CORPORATE', 'INDIVIDUAL'] as const).map((typ) => (
            <button
              key={typ}
              type="button"
              onClick={() => setForm({ ...form, type: typ })}
              className={`flex-1 py-2 rounded-brand text-xs font-semibold border ${
                form.type === typ
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {typ === 'CORPORATE' ? t('customers.typeCorporate') : t('customers.typeIndividual')}
            </button>
          ))}
        </div>
      </div>
      <Input
        id="c-altname"
        label="Alternate Name"
        value={form.alternateName}
        onChange={(e) => setForm({ ...form, alternateName: e.target.value })}
      />
      <Input
        id="c-tax"
        label={t('customers.fieldTaxId')}
        value={form.taxId}
        onChange={(e) => setForm({ ...form, taxId: e.target.value })}
      />
      <Input
        id="c-contact"
        label={t('customers.fieldContact')}
        value={form.contactName}
        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
      />
      <Input
        id="c-phone"
        label={t('customers.fieldPhone')}
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <Input
        id="c-email"
        label={t('customers.fieldEmail')}
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <Input
        id="c-address"
        label={t('customers.fieldAddress')}
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />
      <Input
        id="c-altaddr"
        label="Alternate Address"
        value={form.alternateAddress}
        onChange={(e) => setForm({ ...form, alternateAddress: e.target.value })}
      />
      <div className="border-t border-gray-200 pt-3 mt-1">
        <div className="text-[10px] text-gray-400 mb-2 font-semibold uppercase">WMS Integration</div>
        <Input
          id="c-wms"
          label="WMS Code"
          placeholder="รหัสลูกค้าฝั่ง WMS (ถ้ามี)"
          value={form.wmsCode}
          onChange={(e) => setForm({ ...form, wmsCode: e.target.value })}
        />
      </div>
      {error && (
        <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
      )}
    </>
  );
}
