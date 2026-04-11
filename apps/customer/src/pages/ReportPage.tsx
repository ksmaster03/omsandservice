import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listAssets, createTicket, type ProblemType, type Priority } from '../lib/queries';

const PROBLEM_OPTIONS: Array<{ value: ProblemType; label: string; icon: string }> = [
  { value: 'BELT', label: 'สายพาน / ลื่น / ขาด', icon: '🏃' },
  { value: 'NOISE', label: 'เสียงดังผิดปกติ', icon: '🔊' },
  { value: 'CONSOLE', label: 'Console / หน้าจอ', icon: '📱' },
  { value: 'POWER', label: 'ไม่เปิดติด / ไฟไม่ขึ้น', icon: '⚡' },
  { value: 'MOTOR', label: 'มอเตอร์มีปัญหา', icon: '⚙️' },
  { value: 'OTHER', label: 'อื่นๆ', icon: '❓' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; color: string; emoji: string }> = [
  { value: 'URGENT', label: 'เร่งด่วน', color: 'border-brand-red bg-brand-red-light text-brand-red', emoji: '🔴' },
  { value: 'NORMAL', label: 'ปกติ', color: 'border-brand-gold bg-brand-gold-light text-brand-gold-text', emoji: '🟡' },
  { value: 'LOW', label: 'ไม่เร่ง', color: 'border-status-success bg-status-success-light text-status-success', emoji: '🟢' },
];

export default function ReportPage() {
  const navigate = useNavigate();
  const assets = useQuery({ queryKey: ['assets'], queryFn: listAssets });

  const [assetId, setAssetId] = useState('');
  const [problemType, setProblemType] = useState<ProblemType>('OTHER');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [description, setDescription] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createTicket({ assetId, problemType, priority, description, locationDetail: locationDetail || undefined }),
    onSuccess: (ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'แจ้งซ่อมไม่สำเร็จ';
      setError(msg);
    },
  });

  const canSubmit = assetId && problemType && description.length >= 5;

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-5 rounded-b-[20px] mb-4">
        <h1 className="font-display font-black text-xl">แจ้งซ่อม</h1>
        <div className="text-xs text-white/60 mt-0.5">กรอกรายละเอียดให้ครบ ทีมช่างจะติดต่อกลับ</div>
      </header>

      <div className="px-4 pb-6 space-y-4">
        {/* Asset picker */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <label className="text-[11px] font-bold text-gray-600 block mb-2">เครื่องที่มีปัญหา *</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
          >
            <option value="">— เลือกเครื่อง —</option>
            {assets.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.product.name} · {a.serialNo}
              </option>
            ))}
          </select>
        </div>

        {/* Problem type */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <label className="text-[11px] font-bold text-gray-600 block mb-2">ประเภทปัญหา *</label>
          <div className="grid grid-cols-2 gap-2">
            {PROBLEM_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProblemType(p.value)}
                className={`py-3 px-2 rounded-brand text-xs font-semibold border transition-colors ${
                  problemType === p.value
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                <div className="text-lg mb-0.5">{p.icon}</div>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <label className="text-[11px] font-bold text-gray-600 block mb-2">ความเร่งด่วน *</label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`py-3 rounded-brand text-xs font-semibold border-2 ${
                  priority === p.value ? p.color : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <div className="text-lg mb-0.5">{p.emoji}</div>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <label htmlFor="desc" className="text-[11px] font-bold text-gray-600 block mb-2">
            อธิบายปัญหา *
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เช่น เสียงดังขณะวิ่ง, หน้าจอไม่แสดงผล, สายพานลื่น..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
          />
          <div className="text-[10px] text-gray-400 mt-1">
            {description.length < 5 ? `อีก ${5 - description.length} ตัว` : `${description.length} ตัว`}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <label htmlFor="loc" className="text-[11px] font-bold text-gray-600 block mb-2">
            ตำแหน่งเพิ่มเติม (ไม่บังคับ)
          </label>
          <input
            id="loc"
            type="text"
            value={locationDetail}
            onChange={(e) => setLocationDetail(e.target.value)}
            placeholder="เช่น ชั้น 2 โซน A เครื่องที่ 3"
            className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
          />
        </div>

        {error && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-3 text-center">{error}</div>
        )}

        <button
          onClick={() => createMut.mutate()}
          disabled={!canSubmit || createMut.isPending}
          className="w-full py-4 bg-brand-red text-white font-display font-black text-base rounded-brand-lg shadow-brand-md disabled:opacity-50"
        >
          {createMut.isPending ? 'กำลังส่ง...' : '🔧 ส่งแจ้งซ่อม'}
        </button>
      </div>
    </>
  );
}
