import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import {
  listInstallations,
  getInstallation,
  assignInstallation,
  completeInstallation,
  listUsers,
  type Installation,
} from '../lib/queries';

const STATUS_LABEL: Record<Installation['status'], string> = {
  SCHEDULED: 'กำหนดแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

const STATUS_COLOR: Record<Installation['status'], string> = {
  SCHEDULED: 'bg-status-info-light text-status-info',
  IN_PROGRESS: 'bg-status-warning-light text-brand-gold-text',
  COMPLETED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

export default function InstallationsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['installations'],
    queryFn: () => listInstallations({ pageSize: 50 }),
  });

  const detail = useQuery({
    queryKey: ['installation', selectedId],
    queryFn: () => getInstallation(selectedId!),
    enabled: !!selectedId,
  });

  const installTechs = useQuery({
    queryKey: ['users', 'install'],
    queryFn: () => listUsers({ role: 'INSTALL', pageSize: 100 }),
    enabled: !!selectedId,
  });

  const [assignTechId, setAssignTechId] = useState('');
  const [note, setNote] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [serialNos, setSerialNos] = useState<Record<string, string>>({});

  const assignMut = useMutation({
    mutationFn: () => assignInstallation(selectedId!, assignTechId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations'] });
      qc.invalidateQueries({ queryKey: ['installation', selectedId] });
      setAssignTechId('');
    },
  });

  const completeMut = useMutation({
    mutationFn: () =>
      completeInstallation(selectedId!, {
        note: note || undefined,
        locationDetail: locationDetail || undefined,
        assets: Object.entries(serialNos)
          .filter(([, sn]) => sn.trim())
          .map(([soItemId, serialNo]) => ({ soItemId, serialNo: serialNo.trim() })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installations'] });
      qc.invalidateQueries({ queryKey: ['installation', selectedId] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      setNote('');
      setLocationDetail('');
      setSerialNos({});
      setSelectedId(null);
    },
  });

  return (
    <>
      <PageHeader title="การติดตั้ง" subtitle="ตารางงานติดตั้ง + มอบหมายช่าง + ปิดงาน" />

      <div className="p-6">
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">SO</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ลูกค้า</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">วันนัด</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">ช่าง</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">กำลังโหลด...</td>
                </tr>
              )}
              {!list.isLoading && list.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">ยังไม่มีงานติดตั้ง — สร้าง SO ก่อน</td>
                </tr>
              )}
              {list.data?.items.map((inst: Installation) => (
                <tr key={inst.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{inst.so.soNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{inst.so.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {new Date(inst.scheduledAt).toLocaleString('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {inst.tech ? inst.tech.name : <span className="text-gray-400">— ยังไม่มอบหมาย —</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[inst.status]}`}>
                      {STATUS_LABEL[inst.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(inst.id)}>
                      จัดการ
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail.data ? `ติดตั้ง · ${detail.data.so.soNo}` : 'การติดตั้ง'}
        footer={
          detail.data && detail.data.status !== 'COMPLETED' ? (
            <>
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                ปิด
              </Button>
              <Button
                onClick={() => completeMut.mutate()}
                disabled={
                  !detail.data.so.items.every((it) => serialNos[it.id]?.trim()) || completeMut.isPending
                }
              >
                {completeMut.isPending ? 'กำลังบันทึก...' : '✓ ปิดงาน (สร้าง Asset)'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelectedId(null)}>ปิด</Button>
          )
        }
      >
        {detail.isLoading && <div className="text-gray-400 text-sm py-4">กำลังโหลด...</div>}
        {detail.data && (
          <div className="space-y-4">
            <div className="text-xs text-gray-600">
              <div>ลูกค้า: <span className="font-semibold text-gray-900">{detail.data.so.customer.name}</span></div>
              <div>สถานะ: <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[detail.data.status]}`}>{STATUS_LABEL[detail.data.status]}</span></div>
              <div>วันนัด: {new Date(detail.data.scheduledAt).toLocaleString('th-TH')}</div>
              {detail.data.completedAt && (
                <div>เสร็จเมื่อ: {new Date(detail.data.completedAt).toLocaleString('th-TH')}</div>
              )}
            </div>

            {detail.data.status !== 'COMPLETED' && (
              <div>
                <div className="text-xs font-bold text-gray-700 mb-2">มอบหมายช่างติดตั้ง</div>
                <div className="flex gap-2">
                  <select
                    value={assignTechId}
                    onChange={(e) => setAssignTechId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
                  >
                    <option value="">— เลือกช่าง —</option>
                    {installTechs.data?.items.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="md"
                    disabled={!assignTechId || assignMut.isPending}
                    onClick={() => assignMut.mutate()}
                  >
                    มอบหมาย
                  </Button>
                </div>
                {detail.data.tech && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    ปัจจุบัน: {detail.data.tech.name}
                  </div>
                )}
              </div>
            )}

            {detail.data.status !== 'COMPLETED' && (
              <div>
                <div className="text-xs font-bold text-gray-700 mb-2">
                  ระบุ Serial Number สำหรับทุกรายการ (จำเป็นเพื่อสร้าง Asset)
                </div>
                <div className="space-y-2">
                  {detail.data.so.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-gray-900">{it.product.name}</div>
                        <div className="text-gray-500 font-mono text-[10px]">{it.product.sku}</div>
                      </div>
                      <input
                        type="text"
                        placeholder="S/N"
                        value={serialNos[it.id] ?? ''}
                        onChange={(e) => setSerialNos({ ...serialNos, [it.id]: e.target.value })}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Input
                    id="inst-loc"
                    label="ตำแหน่งติดตั้ง"
                    placeholder="เช่น ชั้น 2 ห้องฟิตเนสหลัก"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                  />
                  <Input
                    id="inst-note"
                    label="หมายเหตุ"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
