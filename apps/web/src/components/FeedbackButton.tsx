import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const TYPES = [
  { value: 'BUG', label: 'แจ้งปัญหา', icon: 'bug_report' },
  { value: 'FEATURE', label: 'ขอฟีเจอร์ใหม่', icon: 'lightbulb' },
  { value: 'IMPROVEMENT', label: 'แนะนำปรับปรุง', icon: 'trending_up' },
  { value: 'QUESTION', label: 'คำถาม', icon: 'help' },
] as const;

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

type Attachment = { url: string; name: string; size: number; contentType: string };

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FeedbackButton({ source = 'admin' }: { source?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'BUG', subject: '', description: '' });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ type: 'BUG', subject: '', description: '' });
    setAttachments([]);
    setUploadError(null);
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      await api.post('/feedback', {
        ...form,
        source,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      resetForm();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    },
  });

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_FILES - attachments.length;
    if (files.length > remaining) {
      setUploadError(`แนบได้สูงสุด ${MAX_FILES} ไฟล์ (เหลือ ${remaining})`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      setUploadError(`ไฟล์ "${tooBig.name}" ใหญ่เกิน 5 MB`);
      return;
    }

    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post<{ ok: boolean; data: Attachment }>('/feedback/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.ok) uploaded.push(res.data.data);
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      setUploadError('อัปโหลดล้มเหลว ลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setUploadError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-brand-red text-white rounded-full shadow-brand-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="แจ้งปัญหา / แนะนำ"
      >
        <span className="material-symbols-outlined !text-[24px]">feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">แจ้งปัญหา / แนะนำ</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <span className="material-symbols-outlined !text-[20px] text-gray-700">close</span>
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined !text-[48px] text-status-success block mb-2">check_circle</span>
                <div className="font-semibold text-status-success">ส่งเรียบร้อยแล้ว ขอบคุณครับ!</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((tp) => (
                    <button
                      key={tp.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: tp.value })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-brand border text-xs font-semibold transition ${
                        form.type === tp.value ? 'bg-brand-red text-white border-brand-red' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-[16px]">{tp.icon}</span>
                      {tp.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">หัวข้อ *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="สรุปปัญหาสั้นๆ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียด *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="อธิบายปัญหา / แนะนำสิ่งที่ต้องการ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      แนบไฟล์ (ไม่บังคับ){' '}
                      <span className="text-gray-600 font-normal">รูป/PDF สูงสุด {MAX_FILES} ไฟล์ ·  5 MB/ไฟล์</span>
                    </label>
                    <span className="text-xs text-gray-600">{attachments.length}/{MAX_FILES}</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    onChange={handleFilePick}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || attachments.length >= MAX_FILES}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-brand text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined !text-[18px]">
                      {uploading ? 'progress_activity' : 'attach_file'}
                    </span>
                    {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
                  </button>

                  {uploadError && (
                    <div className="mt-2 text-xs text-status-danger flex items-start gap-1">
                      <span className="material-symbols-outlined !text-[14px]">error</span>
                      {uploadError}
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((a, i) => {
                        const isImg = a.contentType.startsWith('image/');
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-brand px-2 py-1.5">
                            {isImg ? (
                              <img src={a.url} alt={a.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <span className="material-symbols-outlined !text-[20px] text-gray-600">description</span>
                            )}
                            <span className="flex-1 truncate">{a.name}</span>
                            <span className="text-gray-600">{fmtSize(a.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(i)}
                              className="p-1 rounded hover:bg-gray-200 text-gray-700"
                              title="ลบ"
                            >
                              <span className="material-symbols-outlined !text-[16px]">close</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setOpen(false)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-brand">
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => submitMut.mutate()}
                    disabled={!form.subject.trim() || !form.description.trim() || submitMut.isPending || uploading}
                    className="flex-1 py-2.5 bg-brand-red text-white font-semibold rounded-brand disabled:opacity-50"
                  >
                    {submitMut.isPending ? 'กำลังส่ง...' : 'ส่ง'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
