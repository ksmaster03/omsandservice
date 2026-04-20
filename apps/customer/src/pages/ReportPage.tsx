import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAssets,
  createTicket,
  uploadTicketPhoto,
  type ProblemType,
  type Priority,
  type TicketPhotoUpload,
} from '../lib/queries';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

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
  const [photos, setPhotos] = useState<TicketPhotoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createTicket({
        assetId,
        problemType,
        priority,
        description,
        locationDetail: locationDetail || undefined,
        photoKeys: photos.map((p) => ({ s3Key: p.s3Key, size: p.size })),
      }),
    onSuccess: (ticket) => {
      toast.success('ส่งคำขอแจ้งซ่อมเรียบร้อย — ทีมช่างจะติดต่อกลับโดยเร็ว');
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'แจ้งซ่อมไม่สำเร็จ';
      setError(msg);
      toast.error(msg);
    },
  });

  const handlePickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    const oversize = toUpload.find((f) => f.size > MAX_PHOTO_SIZE);
    if (oversize) {
      toast.error(`ไฟล์ "${oversize.name}" ใหญ่เกิน 10 MB`);
      return;
    }
    setUploading(true);
    try {
      const results: TicketPhotoUpload[] = [];
      for (const file of toUpload) {
        const up = await uploadTicketPhoto(file);
        results.push(up);
      }
      setPhotos((prev) => [...prev, ...results]);
      if (files.length > remaining) {
        toast.warning(`อัปโหลดได้ ${remaining} รูปเท่านั้น (เหลือโควต้าแล้ว)`);
      }
    } catch {
      toast.error('อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const canSubmit = assetId && problemType && description.length >= 5 && !uploading;

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
                  priority === p.value ? p.color : 'border-gray-200 bg-white text-gray-700'
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
          <div className="text-[10px] text-gray-600 mt-1">
            {description.length < 5 ? `อีก ${5 - description.length} ตัว` : `${description.length} ตัว`}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-gray-600">
              รูปถ่ายปัญหา (ไม่บังคับ)
              <span className="ml-1 text-gray-600 font-normal">สูงสุด {MAX_PHOTOS} รูป · 10 MB/รูป</span>
            </label>
            <span className="text-[11px] text-gray-600">{photos.length}/{MAX_PHOTOS}</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePickPhotos}
            className="hidden"
          />
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] border border-dashed border-gray-300 rounded-brand text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-[20px]" aria-hidden="true">
                {uploading ? 'progress_activity' : 'add_a_photo'}
              </span>
              {uploading ? 'กำลังอัปโหลด...' : 'ถ่ายรูป / เลือกรูป'}
            </button>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-brand overflow-hidden bg-gray-100">
                  <img src={p.url} alt={`รูปปัญหา ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="ลบรูป"
                    className="absolute top-1 right-1 w-7 h-7 bg-black/70 text-white rounded-full grid place-items-center"
                  >
                    <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
