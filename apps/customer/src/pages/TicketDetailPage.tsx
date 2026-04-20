import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getTicket, type TicketStage, type Priority } from '../lib/queries';

const STAGE_LABEL: Record<TicketStage, string> = {
  RECEIVED: 'รับแจ้ง',
  ASSIGNED: 'มอบหมายช่าง',
  EN_ROUTE: 'ช่างกำลังเดินทาง',
  ARRIVED: 'ช่างถึงหน้างาน',
  REPAIRING: 'กำลังซ่อม',
  CLOSED: 'ปิดงาน ✓',
  CANCELLED: 'ยกเลิก',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  URGENT: 'bg-brand-red text-white',
  NORMAL: 'bg-brand-gold text-brand-navy',
  LOW: 'bg-status-success text-white',
};

const TIMELINE_ORDER: TicketStage[] = ['RECEIVED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'REPAIRING', 'CLOSED'];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
    refetchInterval: 15_000, // Live updates while the job is in progress
  });

  if (isLoading) return <div className="text-center py-10 text-gray-600">กำลังโหลด...</div>;
  if (!data) return <div className="text-center py-10 text-gray-600">ไม่พบ ticket</div>;

  const currentIdx = TIMELINE_ORDER.indexOf(data.stage);

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-5 rounded-b-[20px] mb-4">
        <Link to="/tickets" className="text-xs text-white/60 inline-flex items-center gap-1">
          <span className="material-symbols-outlined !text-sm" aria-hidden="true">chevron_left</span>
          กลับ
        </Link>
        <div className="font-mono text-[11px] text-white/60 mt-1">{data.ticketNo}</div>
        <h1 className="font-display font-black text-xl">{data.asset.product.name}</h1>
        <div className="text-[11px] text-white/60 font-mono">{data.asset.serialNo}</div>
      </header>

      <div className="px-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700">สถานะปัจจุบัน</div>
              <div className="font-display font-black text-lg text-brand-navy">{STAGE_LABEL[data.stage]}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PRIORITY_COLOR[data.priority]}`}>
              {data.priority}
            </span>
          </div>
          <div className="text-xs text-gray-700 bg-gray-50 rounded p-2">{data.description}</div>
          {data.locationDetail && (
            <div className="text-[11px] text-gray-700 mt-2">📍 {data.locationDetail}</div>
          )}
        </div>

        {/* Tech info if assigned */}
        {data.tech && (
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-2">ช่างที่ดูแล</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">{data.tech.name}</div>
                {data.tech.phone && <div className="text-[11px] text-gray-700">{data.tech.phone}</div>}
              </div>
              {data.tech.phone && (
                <a
                  href={`tel:${data.tech.phone}`}
                  className="px-3 py-2 bg-status-success text-white text-xs font-bold rounded-brand flex items-center gap-1"
                >
                  <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">call</span>
                  โทร
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stepper timeline */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-3">ความคืบหน้า</div>
          <div className="flex items-center justify-between">
            {TIMELINE_ORDER.map((stage, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={stage} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      done
                        ? 'bg-status-success text-white'
                        : active
                        ? 'bg-brand-red text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <div className={`text-[9px] mt-1 text-center ${active ? 'font-bold text-brand-navy' : 'text-gray-600'}`}>
                    {STAGE_LABEL[stage].split(' ')[0]}
                  </div>
                  {i < TIMELINE_ORDER.length - 1 && (
                    <div className={`absolute h-0.5 ${done ? 'bg-status-success' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event log */}
        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-3">ประวัติเหตุการณ์</div>
          <div className="space-y-3">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-brand-red mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{STAGE_LABEL[e.stage]}</div>
                  {e.note && <div className="text-gray-700 text-[11px]">{e.note}</div>}
                  <div className="text-[10px] text-gray-600">
                    {new Date(e.createdAt).toLocaleString('th-TH')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
