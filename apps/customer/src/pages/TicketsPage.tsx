import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listTickets, type Ticket, type TicketStage, type Priority } from '../lib/queries';

const STAGE_LABEL: Record<TicketStage, string> = {
  RECEIVED: 'รับแจ้ง',
  ASSIGNED: 'มอบหมาย',
  EN_ROUTE: 'เดินทาง',
  ARRIVED: 'ถึงหน้างาน',
  REPAIRING: 'กำลังซ่อม',
  CLOSED: 'ปิดงาน',
  CANCELLED: 'ยกเลิก',
};

const STAGE_COLOR: Record<TicketStage, string> = {
  RECEIVED: 'bg-gray-100 text-gray-600',
  ASSIGNED: 'bg-status-info-light text-status-info',
  EN_ROUTE: 'bg-brand-gold-light text-brand-gold-text',
  ARRIVED: 'bg-brand-gold-light text-brand-gold-text',
  REPAIRING: 'bg-status-info-light text-status-info',
  CLOSED: 'bg-status-success-light text-status-success',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  URGENT: 'bg-brand-red text-white',
  NORMAL: 'bg-brand-gold text-brand-navy',
  LOW: 'bg-status-success text-white',
};

export default function TicketsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['tickets'], queryFn: listTickets });

  const open = data?.filter((t) => t.stage !== 'CLOSED' && t.stage !== 'CANCELLED') ?? [];
  const closed = data?.filter((t) => t.stage === 'CLOSED' || t.stage === 'CANCELLED') ?? [];

  return (
    <>
      <header className="bg-brand-navy text-white px-5 py-5 rounded-b-[20px] mb-4">
        <h1 className="font-display font-black text-xl">Service Tickets</h1>
        <div className="text-xs text-white/60 mt-0.5">
          {open.length} งานค้าง · {closed.length} ปิดแล้ว
        </div>
      </header>

      <div className="px-4 space-y-4">
        {isLoading && <div className="text-center py-10 text-gray-600">กำลังโหลด...</div>}

        {!isLoading && open.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-2">กำลังดำเนินการ</div>
            <div className="space-y-2">
              {open.map((t) => <TicketCard key={t.id} t={t} />)}
            </div>
          </div>
        )}

        {!isLoading && closed.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-2">ประวัติ</div>
            <div className="space-y-2">
              {closed.slice(0, 10).map((t) => <TicketCard key={t.id} t={t} />)}
            </div>
          </div>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">
            <div className="text-4xl mb-2">✨</div>
            ยังไม่มีประวัติแจ้งซ่อม
          </div>
        )}
      </div>
    </>
  );
}

function TicketCard({ t }: { t: Ticket }) {
  return (
    <Link
      to={`/tickets/${t.id}`}
      className="block bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-4"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-mono text-[11px] text-gray-700">{t.ticketNo}</div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority]}`}>
          {t.priority}
        </span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{t.asset.product.name}</div>
      <div className="text-[11px] text-gray-700 font-mono">{t.asset.serialNo}</div>
      <div className="text-xs text-gray-600 mt-1 line-clamp-1">{t.description}</div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLOR[t.stage]}`}>
          {STAGE_LABEL[t.stage]}
        </span>
        <span className="text-[10px] text-gray-600">{new Date(t.createdAt).toLocaleDateString('th-TH')}</span>
      </div>
    </Link>
  );
}
