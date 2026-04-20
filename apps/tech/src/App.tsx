import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { login, getMe, logout, getMyTickets, getMyPmJobs, updateTicketStage, getTechSettings, type TechTicket, type TechPmJob } from './lib/queries';
import { useAuth } from './store/auth';
import { useGpsTracker, openGoogleMapsNavigation } from './hooks/useGpsTracker';
import { useTechSocket } from './hooks/useTechSocket';
import { Toaster, toast } from 'sonner';
import ServerStatus from './components/ServerStatus';
import LanguageSwitcher from './components/LanguageSwitcher';
import FeedbackButton from './components/FeedbackButton';
import ErrorBoundary from './components/ErrorBoundary';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import * as offlineQueue from './lib/offlineQueue';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// ────────── Login ──────────
function LoginScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login(email, password);
      setUser(u);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        (err as Error).message;
      setError(msg ?? t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher dark />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100%-2rem)]">
        <ServerStatus />
      </div>
      <div className="w-full max-w-sm bg-white/10 rounded-brand-lg p-6 backdrop-blur-sm">
        <div className="text-center mb-5">
          <div className="inline-flex w-14 h-14 rounded-brand-lg bg-brand-gold text-brand-navy items-center justify-center mb-3">
            <span className="material-symbols-outlined !text-3xl" aria-hidden="true">build</span>
          </div>
          <h1 className="font-display font-black text-xl">{t('auth.appName')}</h1>
          <p className="text-xs text-white/60 mt-0.5">{t('auth.tagline')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="t-email" className="block text-xs font-semibold text-white/70 mb-1">{t('auth.email')}</label>
            <input
              id="t-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-brand text-sm text-white focus:outline-none focus:border-brand-gold"
              required
            />
          </div>
          <div>
            <label htmlFor="t-pw" className="block text-xs font-semibold text-white/70 mb-1">{t('auth.password')}</label>
            <input
              id="t-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-brand text-sm text-white focus:outline-none focus:border-brand-gold"
              required
            />
          </div>
          {error && (
            <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-gold text-brand-navy font-semibold rounded-brand disabled:opacity-50"
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ────────── Ticket list + active ticket ──────────
const PRIORITY_COLOR: Record<TechTicket['priority'], string> = {
  URGENT: 'bg-brand-red text-white',
  NORMAL: 'bg-brand-gold text-brand-navy',
  LOW: 'bg-status-success text-white',
};

// Stage transition map (label resolved via t() inside TicketCard).
const NEXT_STAGE: Record<string, { stage: string; labelKey: string } | null> = {
  ASSIGNED: { stage: 'EN_ROUTE', labelKey: 'EN_ROUTE' },
  EN_ROUTE: { stage: 'ARRIVED', labelKey: 'ARRIVED' },
  ARRIVED: { stage: 'REPAIRING', labelKey: 'REPAIRING' },
  REPAIRING: { stage: 'CLOSED', labelKey: 'CLOSED' },
  RECEIVED: { stage: 'EN_ROUTE', labelKey: 'EN_ROUTE' },
  CLOSED: null,
  CANCELLED: null,
};

function TicketCard({ ticket, gpsActive }: { ticket: TechTicket; gpsActive?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const next = NEXT_STAGE[ticket.stage];

  const stageMut = useMutation({
    mutationFn: () => updateTicketStage(ticket.id, next!.stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 30, 80]);
    },
    onError: () => {
      // Offline or network error: queue for later
      if (!navigator.onLine) {
        offlineQueue.enqueue({ ticketId: ticket.id, toStage: next!.stage });
        toast.info('ออฟไลน์ — บันทึกไว้ในคิว จะซิงค์เมื่อกลับมาออนไลน์');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 40, 100]);
      } else {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200]);
      }
    },
  });

  function navigate() {
    if (ticket.locationLat && ticket.locationLng) {
      openGoogleMapsNavigation(Number(ticket.locationLat), Number(ticket.locationLng));
    } else if (ticket.customer.address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ticket.customer.address)}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function call() {
    if (ticket.customer.phone) {
      window.location.href = `tel:${ticket.customer.phone}`;
    }
  }

  const isActive = ['EN_ROUTE', 'ARRIVED', 'REPAIRING'].includes(ticket.stage);

  return (
    <div className="bg-white text-brand-navy rounded-brand-lg p-4 shadow-brand-md">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-[11px] text-gray-600">{ticket.ticketNo}</div>
          <div className="font-display font-black text-lg">{ticket.customer.name}</div>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_COLOR[ticket.priority]}`}>
          {t(`ticket.priority.${ticket.priority}`)}
        </span>
      </div>

      {isActive && gpsActive && (
        <div className="mb-2 inline-flex items-center gap-1.5 bg-status-success/10 text-status-success px-2.5 py-1 rounded-full text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
          <span>กำลังบันทึกตำแหน่ง</span>
        </div>
      )}

      <div className="text-sm text-gray-700 mb-2">
        <div className="font-semibold">{t(`ticket.problem.${ticket.problemType}`)} · {ticket.asset.product.name}</div>
        <div className="font-mono text-[11px] text-gray-600">{ticket.asset.serialNo}</div>
      </div>

      <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 mb-3">{ticket.description}</div>

      {ticket.locationDetail && (
        <div className="text-xs text-gray-700 mb-3">📍 {ticket.locationDetail}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={navigate}
          disabled={!ticket.locationLat && !ticket.customer.address}
          aria-label={t('ticket.navigate')}
          className="py-3 min-h-[48px] bg-brand-navy text-white text-sm font-semibold rounded-brand disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[.98] transition"
        >
          <span className="material-symbols-outlined !text-[20px]" aria-hidden="true">directions</span>
          {t('ticket.navigate')}
        </button>
        <button
          type="button"
          onClick={call}
          disabled={!ticket.customer.phone}
          aria-label={t('ticket.callCustomer')}
          className="py-3 min-h-[48px] bg-status-success text-white text-sm font-semibold rounded-brand disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[.98] transition"
        >
          <span className="material-symbols-outlined !text-[20px]" aria-hidden="true">call</span>
          {t('ticket.callCustomer')}
        </button>
      </div>

      {next && (
        <button
          type="button"
          onClick={() => stageMut.mutate()}
          disabled={stageMut.isPending}
          className="w-full py-4 min-h-[56px] bg-brand-red text-white text-base font-bold rounded-brand disabled:opacity-50 active:scale-[.98] transition flex items-center justify-center gap-2"
        >
          {stageMut.isPending && <span className="material-symbols-outlined !text-[20px] animate-spin" aria-hidden="true">progress_activity</span>}
          → {t(`ticket.nextStage.${next.labelKey}`)}
        </button>
      )}
      {stageMut.isError && (
        <div className="mt-2 text-xs text-brand-red bg-brand-red-light rounded-brand p-2 flex items-center gap-1.5" role="alert">
          <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">error</span>
          อัปเดตไม่สำเร็จ ลองแตะอีกครั้ง
        </div>
      )}
      {!next && ticket.stage === 'CLOSED' && (
        <div className="text-center text-xs font-semibold text-status-success py-2">{t('ticket.closed')}</div>
      )}
    </div>
  );
}

function HomeScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [pendingOffline, online] = useOfflineQueue();

  // Real-time push via WebSocket — invalidates my-tickets on assignment/stage change
  useTechSocket(!!user);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: getMyTickets,
    refetchInterval: 60_000,
  });
  const { data: pmJobs } = useQuery({
    queryKey: ['my-pm'],
    queryFn: getMyPmJobs,
    refetchInterval: 120_000,
  });
  const { data: settings } = useQuery({
    queryKey: ['tech-settings'],
    queryFn: getTechSettings,
  });

  const gpsInterval = Number(settings?.gps_interval_seconds ?? 30);
  const activeTicket = tickets?.find((t) => ['EN_ROUTE', 'ARRIVED', 'REPAIRING'].includes(t.stage));
  const { lastPing, error: gpsError } = useGpsTracker(gpsEnabled, activeTicket?.id, gpsInterval);

  // Auto-enable GPS when there's an active ticket
  useEffect(() => {
    if (activeTicket && !gpsEnabled) setGpsEnabled(true);
  }, [activeTicket, gpsEnabled]);

  function doLogout() {
    logout();
    setUser(null);
    qc.clear();
    navigate('/login');
  }

  return (
    <div className="min-h-screen pb-6">
      <header className="bg-white/10 px-4 py-3 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-black text-base">{t('home.appName')}</div>
            <div className="text-[10px] text-white/60">{user?.name} · {user?.role}</div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher dark />
            <button
              onClick={doLogout}
              aria-label={t('auth.logout')}
              className="p-2 rounded hover:bg-white/10"
            >
              <span className="material-symbols-outlined !text-[20px]" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between bg-white/5 rounded-brand px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${gpsEnabled && !gpsError ? 'bg-status-success animate-pulse' : 'bg-gray-500'}`}></span>
            {t('home.gps')}: {gpsEnabled
              ? (gpsError
                  ? t('home.gpsError')
                  : lastPing
                    ? t('home.gpsAgo', { seconds: Math.floor((Date.now() - lastPing.getTime()) / 1000) })
                    : t('home.gpsStarting'))
              : 'off'}
          </div>
          <button
            onClick={() => setGpsEnabled((v) => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${gpsEnabled ? 'bg-status-success text-white' : 'bg-white/20 text-white'}`}
          >
            {gpsEnabled ? t('home.gpsOn') : t('home.gpsOff')}
          </button>
        </div>
        {gpsError && <div className="text-[10px] text-brand-red mt-1">{gpsError}</div>}

        {(!online || pendingOffline > 0) && (
          <div
            role="status"
            className={`mt-2 flex items-center gap-2 rounded-brand px-3 py-1.5 text-[11px] font-semibold ${
              !online ? 'bg-brand-red/20 text-brand-red' : 'bg-brand-gold/20 text-brand-gold'
            }`}
          >
            <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">
              {!online ? 'wifi_off' : 'cloud_sync'}
            </span>
            {!online
              ? `ออฟไลน์ · การกระทำจะบันทึกในเครื่อง${pendingOffline > 0 ? ` (${pendingOffline} ในคิว)` : ''}`
              : `กำลังซิงค์ ${pendingOffline} รายการที่ค้าง...`}
          </div>
        )}
      </header>

      <main className="p-4 space-y-3">
        {isLoading && <div className="text-center text-white/60 py-10 text-sm">{t('common.loading')}</div>}
        {!isLoading && tickets?.length === 0 && (
          <div className="text-center py-10 text-white/60 text-sm">
            <div className="text-4xl mb-2">✅</div>
            {t('home.noTickets')}
          </div>
        )}
        {tickets?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} gpsActive={gpsEnabled && !gpsError} />
        ))}

        {/* PM Schedule section */}
        {pmJobs && pmJobs.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-4">
              <span className="material-symbols-outlined !text-[20px] text-brand-gold" aria-hidden="true">build</span>
              <span className="font-display font-bold text-sm">PM ({pmJobs.length})</span>
            </div>
            {pmJobs.map((pm: TechPmJob) => (
              <div key={pm.id} className="bg-white text-brand-navy rounded-brand-lg p-4 shadow-brand-md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-display font-black text-lg">{pm.asset.customer.name}</div>
                    <div className="text-xs text-gray-600 font-semibold">{pm.asset.product.name}</div>
                    <div className="font-mono text-[10px] text-gray-500">{pm.asset.serialNo}</div>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-gold text-brand-navy">
                    PM
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {t('installations.scheduledLabel')}: {new Date(pm.scheduledAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                {pm.asset.customer.phone && (
                  <button
                    onClick={() => { window.location.href = `tel:${pm.asset.customer.phone}`; }}
                    className="w-full py-2.5 bg-status-success text-white text-xs font-semibold rounded-brand flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">call</span>
                    {t('ticket.callCustomer')}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('techAccessToken') : null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (token && !user) {
      getMe()
        .then((u) => {
          setUser(u);
          setReady(true);
        })
        .catch(() => {
          localStorage.removeItem('techAccessToken');
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [token, user, setUser]);

  if (!ready) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<Protected><HomeScreen /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <FeedbackButton source="tech" />
          <Toaster position="top-center" richColors closeButton duration={4000} theme="dark" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
