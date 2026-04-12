import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const TYPES = [
  { value: 'BUG', label: 'แจ้งปัญหา', icon: 'bug_report' },
  { value: 'FEATURE', label: 'ขอฟีเจอร์ใหม่', icon: 'lightbulb' },
  { value: 'IMPROVEMENT', label: 'แนะนำปรับปรุง', icon: 'trending_up' },
  { value: 'QUESTION', label: 'คำถาม', icon: 'help' },
] as const;

export default function FeedbackButton({ source = 'admin' }: { source?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'BUG', subject: '', description: '' });
  const [success, setSuccess] = useState(false);

  const submitMut = useMutation({
    mutationFn: async () => {
      await api.post('/feedback', { ...form, source });
    },
    onSuccess: () => {
      setSuccess(true);
      setForm({ type: 'BUG', subject: '', description: '' });
      setTimeout(() => { setSuccess(false); setOpen(false); }, 2000);
    },
  });

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
                <span className="material-symbols-outlined !text-[20px] text-gray-500">close</span>
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

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setOpen(false)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-brand">
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => submitMut.mutate()}
                    disabled={!form.subject.trim() || !form.description.trim() || submitMut.isPending}
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
