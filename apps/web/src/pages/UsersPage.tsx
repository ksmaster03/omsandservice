import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listUsers, createUser } from '../lib/queries';

const ROLES = ['SALES', 'INSTALL', 'SERVICE', 'ADMIN'] as const;
type Role = (typeof ROLES)[number];

const roleLabel: Record<Role, string> = {
  SALES: 'ฝ่ายขาย',
  INSTALL: 'ทีมติดตั้ง',
  SERVICE: 'ทีมบริการ',
  ADMIN: 'ผู้ดูแลระบบ',
};

const roleColor: Record<Role, string> = {
  SALES: 'bg-status-info-light text-status-info',
  INSTALL: 'bg-status-warning-light text-brand-gold-text',
  SERVICE: 'bg-status-success-light text-status-success',
  ADMIN: 'bg-brand-red-light text-brand-red',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, roleFilter }],
    queryFn: () => listUsers({ search: search || undefined, role: roleFilter || undefined, pageSize: 100 }),
  });

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'SALES' as Role,
  });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createUser({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpenCreate(false);
      setForm({ email: '', password: '', name: '', phone: '', role: 'SALES' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'สร้างผู้ใช้ไม่สำเร็จ';
      setError(msg);
    },
  });

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้"
        subtitle="สำหรับ Admin เท่านั้น — สร้างและจัดการบัญชีพนักงาน"
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined !text-[18px]">person_add</span>
            เพิ่มผู้ใช้
          </Button>
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
              placeholder="ค้นหาชื่อ / อีเมล / เบอร์"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-brand p-1">
            <button
              onClick={() => setRoleFilter('')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                !roleFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'
              }`}
            >
              ทั้งหมด
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  roleFilter === r ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'
                }`}
              >
                {roleLabel[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ชื่อ</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">อีเมล</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">เบอร์</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Role</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">กำลังโหลด...</td>
                </tr>
              )}
              {data?.items.map((u) => (
                <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{u.phone || '–'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleColor[u.role]}`}>
                      {roleLabel[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.active ? (
                      <span className="text-[11px] font-semibold text-status-success">● ใช้งาน</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400">● ปิด</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="เพิ่มผู้ใช้ใหม่"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.email || !form.password || !form.name || createMut.isPending}
            >
              {createMut.isPending ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
            </Button>
          </>
        }
      >
        <Input
          id="u-email"
          label="อีเมล *"
          type="email"
          placeholder="name@nbasport.local"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          id="u-password"
          label="รหัสผ่าน * (อย่างน้อย 8 ตัว)"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Input
          id="u-name"
          label="ชื่อ *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          id="u-phone"
          label="เบอร์โทร"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`py-2 rounded-brand text-xs font-semibold border ${
                  form.role === r
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {roleLabel[r]}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{error}</div>
        )}
      </Modal>
    </>
  );
}
