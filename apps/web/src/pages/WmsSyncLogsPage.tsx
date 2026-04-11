import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import { listWmsSyncLogs, getWmsStatus, type WmsSyncLog } from '../lib/queries';

const STATUS_COLOR: Record<WmsSyncLog['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SUCCESS: 'bg-status-success-light text-status-success',
  FAILED: 'bg-brand-red-light text-brand-red',
  RETRY: 'bg-status-warning-light text-brand-gold-text',
};

export default function WmsSyncLogsPage() {
  const [statusFilter, setStatusFilter] = useState<WmsSyncLog['status'] | ''>('');

  const { data: wmsStatus } = useQuery({
    queryKey: ['wms-status'],
    queryFn: getWmsStatus,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['wms-sync-logs', { statusFilter }],
    queryFn: () => listWmsSyncLogs({ status: statusFilter || undefined }),
  });

  return (
    <>
      <PageHeader
        title="WMS Integration"
        subtitle="สถานะการเชื่อมต่อ WMS + ประวัติการ sync"
        action={
          wmsStatus && (
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${wmsStatus.mode === 'mock' ? 'bg-status-warning-light text-brand-gold-text' : 'bg-status-success-light text-status-success'}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                Adapter: {wmsStatus.mode.toUpperCase()}
              </div>
            </div>
          )
        }
      />

      <div className="p-6">
        <div className="bg-status-warning-light border border-brand-gold rounded-brand p-3 mb-4 text-xs text-brand-navy">
          <strong>MVP Note:</strong> ขณะนี้ใช้ Mock adapter — stock values คำนวณจาก SKU hash, order push คืน fake ID.
          จะสลับเป็น live adapter เมื่อได้ spec ของ WMS จริง (ปรับแค่ <code className="font-mono bg-white px-1 rounded">apps/api/src/lib/wms.ts</code>)
        </div>

        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded text-xs font-semibold ${!statusFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
          >
            ทั้งหมด
          </button>
          {(['SUCCESS', 'FAILED', 'PENDING', 'RETRY'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold ${statusFilter === s ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Entity</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Action</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">When</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Detail</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>}
              {!isLoading && data?.items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">ยังไม่มีการ sync</td></tr>
              )}
              {data?.items.map((log: WmsSyncLog) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{log.entity}</td>
                  <td className="px-4 py-3 text-xs uppercase font-semibold">{log.action}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[log.status]}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(log.createdAt).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono line-clamp-2 max-w-[300px]">
                    {log.errorMsg ?? JSON.stringify(log.requestJson).slice(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
