import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import api from '../lib/api';

interface Feedback {
  id: string;
  type: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  source: string;
  submitterName: string | null;
  submitterEmail: string | null;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  _count: { replies: number };
}

interface FeedbackDetail extends Feedback {
  replies: Array<{
    id: string;
    message: string;
    authorName: string;
    authorRole: string | null;
    isInternal: boolean;
    createdAt: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  BUG: 'แจ้งปัญหา',
  FEATURE: 'ขอฟีเจอร์ใหม่',
  IMPROVEMENT: 'แนะนำปรับปรุง',
  QUESTION: 'คำถาม',
  OTHER: 'อื่นๆ',
};
const TYPE_ICONS: Record<string, string> = {
  BUG: 'bug_report',
  FEATURE: 'lightbulb',
  IMPROVEMENT: 'trending_up',
  QUESTION: 'help',
  OTHER: 'chat',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-status-info-light text-status-info',
  IN_PROGRESS: 'bg-status-warning-light text-brand-gold-text',
  RESOLVED: 'bg-status-success-light text-status-success',
  CLOSED: 'bg-gray-200 text-gray-600',
  WONT_FIX: 'bg-gray-200 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'เปิด',
  IN_PROGRESS: 'กำลังดำเนินการ',
  RESOLVED: 'แก้ไขแล้ว',
  CLOSED: 'ปิด',
  WONT_FIX: 'ไม่แก้ไข',
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-brand-gold-text',
  HIGH: 'text-brand-red',
  CRITICAL: 'text-white bg-brand-red',
};

export default function FeedbackPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [resolution, setResolution] = useState('');

  const list = useQuery({
    queryKey: ['feedback', statusFilter],
    queryFn: async () => {
      const res = await api.get('/feedback', { params: { status: statusFilter || undefined } });
      return res.data.data as { items: Feedback[]; total: number };
    },
  });

  const detail = useQuery({
    queryKey: ['feedback-detail', selectedId],
    queryFn: async () => {
      const res = await api.get(`/feedback/${selectedId}`);
      return res.data.data as FeedbackDetail;
    },
    enabled: !!selectedId,
  });

  const statusMut = useMutation({
    mutationFn: async () => {
      await api.patch(`/feedback/${selectedId}`, { status: updateStatus, resolution: resolution || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
      qc.invalidateQueries({ queryKey: ['feedback-detail'] });
      setUpdateStatus('');
      setResolution('');
    },
  });

  const replyMut = useMutation({
    mutationFn: async () => {
      await api.post(`/feedback/${selectedId}/reply`, { message: replyText });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-detail'] });
      setReplyText('');
    },
  });

  return (
    <>
      <PageHeader title="Feedback" subtitle="แจ้งปัญหา / แนะนำ / คำถามจากผู้ใช้งาน" />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex gap-1 bg-gray-100 rounded-brand p-1 w-fit flex-wrap">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded text-xs font-semibold ${!statusFilter ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}>
            {t('common.all')}
          </button>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1 rounded text-xs font-semibold ${statusFilter === k ? 'bg-white shadow-brand-sm text-brand-navy' : 'text-gray-500'}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ประเภท</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">หัวข้อ</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ผู้แจ้ง</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Priority</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">{t('common.status')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ตอบ</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('common.loading')}</td></tr>}
              {!list.isLoading && list.data?.items.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">ยังไม่มี feedback</td></tr>}
              {list.data?.items.map((fb) => (
                <tr key={fb.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-[16px] text-gray-500">{TYPE_ICONS[fb.type] ?? 'chat'}</span>
                      <span className="text-xs">{TYPE_LABELS[fb.type] ?? fb.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[250px] truncate">{fb.subject}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fb.submitterName ?? fb.source}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[fb.priority] ?? ''}`}>{fb.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[fb.status]}`}>{STATUS_LABELS[fb.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{fb._count.replies}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedId(fb.id); setUpdateStatus(fb.status); setResolution(fb.resolution ?? ''); }}>
                      {t('common.details')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail + manage modal */}
      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title={detail.data ? `#${detail.data.id.slice(0, 8)} — ${detail.data.subject}` : 'Feedback'}>
        {detail.isLoading && <div className="text-center py-4 text-gray-400">{t('common.loading')}</div>}
        {detail.data && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500">ประเภท:</span> <strong>{TYPE_LABELS[detail.data.type]}</strong></div>
              <div><span className="text-gray-500">Priority:</span> <strong className={PRIORITY_COLOR[detail.data.priority]}>{detail.data.priority}</strong></div>
              <div><span className="text-gray-500">ผู้แจ้ง:</span> <strong>{detail.data.submitterName ?? 'ไม่ระบุ'}</strong></div>
              <div><span className="text-gray-500">Source:</span> <strong>{detail.data.source}</strong></div>
            </div>

            <div className="bg-gray-50 rounded-brand p-3 text-xs whitespace-pre-wrap">{detail.data.description}</div>

            {detail.data.resolution && (
              <div className="bg-status-success-light rounded-brand p-3 text-xs">
                <div className="font-semibold text-status-success mb-1">Resolution</div>
                {detail.data.resolution}
              </div>
            )}

            {/* Update status */}
            <div className="border-t pt-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">อัปเดตสถานะ</div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setUpdateStatus(k)}
                    className={`px-3 py-1.5 rounded-brand text-xs font-semibold border transition ${updateStatus === k ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {v}
                  </button>
                ))}
              </div>
              {updateStatus !== detail.data.status && (
                <div className="mt-2 space-y-2">
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} placeholder="วิธีแก้ไข / เหตุผล (ไม่บังคับ)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-brand text-xs focus:outline-none focus:border-brand-red" />
                  <Button size="sm" onClick={() => statusMut.mutate()} disabled={statusMut.isPending}>
                    {statusMut.isPending ? t('common.saving') : 'อัปเดต'}
                  </Button>
                </div>
              )}
            </div>

            {/* Replies */}
            <div className="border-t pt-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">ความคิดเห็น ({detail.data.replies.length})</div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {detail.data.replies.map((r) => (
                  <div key={r.id} className={`rounded-brand p-2 text-xs ${r.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{r.authorName} {r.authorRole ? `(${r.authorRole})` : ''}</span>
                      <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleString('th-TH')}</span>
                    </div>
                    {r.message}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="ตอบกลับ..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-brand text-xs focus:outline-none focus:border-brand-red" />
                <Button size="sm" disabled={!replyText.trim() || replyMut.isPending} onClick={() => replyMut.mutate()}>
                  ส่ง
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
