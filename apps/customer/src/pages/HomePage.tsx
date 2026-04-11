import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAssets, listTickets, listRenewals, type WarrantyStatus } from '../lib/queries';
import { useAuth } from '../store/auth';

const warrantyLabel: Record<WarrantyStatus, string> = {
  active: 'ปกติ',
  expiring: 'ใกล้หมด',
  expired: 'หมดอายุ',
};

const warrantyColor: Record<WarrantyStatus, string> = {
  active: 'bg-status-success text-white',
  expiring: 'bg-brand-gold text-brand-navy',
  expired: 'bg-brand-red text-white',
};

export default function HomePage() {
  const { me } = useAuth();
  const assets = useQuery({ queryKey: ['assets'], queryFn: listAssets });
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: listTickets });
  const renewals = useQuery({ queryKey: ['renewals'], queryFn: listRenewals });

  const openTickets = tickets.data?.filter((t) => t.stage !== 'CLOSED' && t.stage !== 'CANCELLED') ?? [];
  const pendingRenewals = renewals.data?.filter((r) => r.status === 'OFFERED') ?? [];
  const expiringAssets = assets.data?.filter((a) => a.warrantyStatus === 'expiring') ?? [];

  return (
    <>
      {/* Header */}
      <header className="bg-brand-navy text-white px-5 py-6 rounded-b-[20px]">
        <div className="text-xs text-white/60">ยินดีต้อนรับ</div>
        <div className="font-display font-black text-xl">{me?.customer.name ?? '—'}</div>
        <div className="text-[11px] text-white/50">{me?.displayName}</div>
      </header>

      <div className="px-4 -mt-6 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/equipment"
            className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-3 text-center"
          >
            <span className="material-symbols-outlined !text-2xl text-brand-red" aria-hidden="true">
              fitness_center
            </span>
            <div className="font-display font-black text-xl text-brand-navy leading-none mt-1">
              {assets.data?.length ?? '—'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">เครื่อง</div>
          </Link>
          <Link
            to="/tickets"
            className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-3 text-center"
          >
            <span className="material-symbols-outlined !text-2xl text-brand-gold" aria-hidden="true">
              confirmation_number
            </span>
            <div className="font-display font-black text-xl text-brand-navy leading-none mt-1">
              {openTickets.length}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">งานค้าง</div>
          </Link>
          <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-3 text-center">
            <span className="material-symbols-outlined !text-2xl text-status-info" aria-hidden="true">
              shield
            </span>
            <div className="font-display font-black text-xl text-brand-navy leading-none mt-1">
              {expiringAssets.length}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">ใกล้หมดประกัน</div>
          </div>
        </div>

        {/* Open tickets */}
        {openTickets.length > 0 && (
          <div>
            <div className="text-xs font-bold text-brand-navy mb-2 flex items-center justify-between">
              <span>งานค้าง</span>
              <Link to="/tickets" className="text-[11px] font-semibold text-brand-red">ทั้งหมด ›</Link>
            </div>
            <div className="space-y-2">
              {openTickets.slice(0, 2).map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="block bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-mono text-[11px] text-gray-500">{t.ticketNo}</div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.priority === 'URGENT' ? 'bg-brand-red text-white' :
                      t.priority === 'NORMAL' ? 'bg-brand-gold text-brand-navy' :
                      'bg-status-success text-white'
                    }`}>
                      {t.priority}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{t.asset.product.name}</div>
                  <div className="text-xs text-gray-500 line-clamp-1">{t.description}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Expiring warranty alert */}
        {expiringAssets.length > 0 && (
          <div className="bg-brand-gold-light border border-brand-gold rounded-brand-lg p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined !text-xl text-brand-gold-text mt-0.5" aria-hidden="true">
                warning
              </span>
              <div className="flex-1">
                <div className="text-xs font-bold text-brand-navy">ประกันใกล้หมด {expiringAssets.length} เครื่อง</div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  ติดต่อทีมขายเพื่อต่อประกันก่อนหมดอายุ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending renewals */}
        {pendingRenewals.length > 0 && (
          <div>
            <div className="text-xs font-bold text-brand-navy mb-2">ข้อเสนอต่อประกัน</div>
            <div className="space-y-2">
              {pendingRenewals.map((r) => (
                <div key={r.id} className="bg-white rounded-brand-lg shadow-brand-sm border border-brand-gold p-3">
                  <div className="text-sm font-semibold">{r.asset.product.name}</div>
                  <div className="text-[11px] text-gray-500 font-mono">{r.asset.serialNo}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-brand-red font-display font-black">
                      ฿{Number(r.price).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      ถึง {r.newEndDate ? new Date(r.newEndDate).toLocaleDateString('th-TH') : '–'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
