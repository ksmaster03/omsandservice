import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { login, getMe, logout, getMyTickets, updateTicketStage, getTechSettings, type TechTicket } from './lib/queries';
import { useAuth } from './store/auth';
import { useGpsTracker, openGoogleMapsNavigation } from './hooks/useGpsTracker';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// ────────── Login ──────────
function LoginScreen() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('service1@nbasport.local');
  const [password, setPassword] = useState('Nba@12345');
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
      setError(msg ?? 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/10 rounded-brand-lg p-6 backdrop-blur-sm">
        <div className="text-center mb-5">
          <div className="inline-flex w-14 h-14 rounded-brand-lg bg-brand-gold text-brand-navy items-center justify-center mb-3">
            <span className="material-symbols-outlined !text-3xl" aria-hidden="true">build</span>
          </div>
          <h1 className="font-display font-black text-xl">NBA Sport Tech</h1>
          <p className="text-xs text-white/60 mt-0.5">สำหรับทีมติดตั้ง + บริการ</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="t-email" className="block text-xs font-semibold text-white/70 mb-1">อีเมล</label>
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
            <label htmlFor="t-pw" className="block text-xs font-semibold text-white/70 mb-1">รหัสผ่าน</label>
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
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p className="text-[10px] text-white/40 text-center mt-3">
          Seed: service1@nbasport.local / Nba@12345
        </p>
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

const PROBLEM_LABEL: Record<TechTicket['problemType'], string> = {
  BELT: 'สายพาน',
  NOISE: 'เสียงดัง',
  CONSOLE: 'Console',
  MOTOR: 'มอเตอร์',
  POWER: 'ไฟ/ไม่เปิดติด',
  OTHER: 'อื่นๆ',
};

const NEXT_STAGE: Record<string, { stage: string; label: string } | null> = {
  ASSIGNED: { stage: 'EN_ROUTE', label: 'เริ่มเดินทาง' },
  EN_ROUTE: { stage: 'ARRIVED', label: 'ถึงหน้างานแล้ว' },
  ARRIVED: { stage: 'REPAIRING', label: 'เริ่มซ่อม' },
  REPAIRING: { stage: 'CLOSED', label: 'ปิดงาน' },
  RECEIVED: { stage: 'EN_ROUTE', label: 'เริ่มเดินทาง' },
  CLOSED: null,
  CANCELLED: null,
};

function TicketCard({ t }: { t: TechTicket }) {
  const qc = useQueryClient();
  const next = NEXT_STAGE[t.stage];

  const stageMut = useMutation({
    mutationFn: () => updateTicketStage(t.id, next!.stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tickets'] }),
  });

  function navigate() {
    if (t.locationLat && t.locationLng) {
      openGoogleMapsNavigation(Number(t.locationLat), Number(t.locationLng));
    } else if (t.customer.address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.customer.address)}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function call() {
    if (t.customer.phone) {
      window.location.href = `tel:${t.customer.phone}`;
    }
  }

  return (
    <div className="bg-white text-brand-navy rounded-brand-lg p-4 shadow-brand-md">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-[11px] text-gray-500">{t.ticketNo}</div>
          <div className="font-display font-black text-lg">{t.customer.name}</div>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLOR[t.priority]}`}>
          {t.priority}
        </span>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        <div className="font-semibold">{PROBLEM_LABEL[t.problemType]} · {t.asset.product.name}</div>
        <div className="font-mono text-[10px]">{t.asset.serialNo}</div>
      </div>

      <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 mb-3">{t.description}</div>

      {t.locationDetail && (
        <div className="text-[11px] text-gray-500 mb-3">📍 {t.locationDetail}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={navigate}
          disabled={!t.locationLat && !t.customer.address}
          className="py-2.5 bg-brand-navy text-white text-xs font-semibold rounded-brand disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">directions</span>
          นำทาง
        </button>
        <button
          onClick={call}
          disabled={!t.customer.phone}
          className="py-2.5 bg-status-success text-white text-xs font-semibold rounded-brand disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">call</span>
          โทรหาลูกค้า
        </button>
      </div>

      {next && (
        <button
          onClick={() => stageMut.mutate()}
          disabled={stageMut.isPending}
          className="w-full py-3 bg-brand-red text-white font-bold rounded-brand disabled:opacity-50"
        >
          → {next.label}
        </button>
      )}
      {!next && t.stage === 'CLOSED' && (
        <div className="text-center text-xs font-semibold text-status-success py-2">✓ ปิดงานแล้ว</div>
      )}
    </div>
  );
}

function HomeScreen() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [gpsEnabled, setGpsEnabled] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: getMyTickets,
    refetchInterval: 30_000,
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
            <div className="font-display font-black text-base">NBA Sport Tech</div>
            <div className="text-[10px] text-white/60">{user?.name} · {user?.role}</div>
          </div>
          <button
            onClick={doLogout}
            aria-label="ออกจากระบบ"
            className="p-2 rounded hover:bg-white/10"
          >
            <span className="material-symbols-outlined !text-[20px]" aria-hidden="true">logout</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between bg-white/5 rounded-brand px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${gpsEnabled && !gpsError ? 'bg-status-success animate-pulse' : 'bg-gray-500'}`}></span>
            GPS: {gpsEnabled ? (gpsError ? 'error' : lastPing ? `ping ${Math.floor((Date.now() - lastPing.getTime()) / 1000)}s ago` : 'starting...') : 'off'}
          </div>
          <button
            onClick={() => setGpsEnabled((v) => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${gpsEnabled ? 'bg-status-success text-white' : 'bg-white/20 text-white'}`}
          >
            {gpsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {gpsError && <div className="text-[10px] text-brand-red mt-1">{gpsError}</div>}
      </header>

      <main className="p-4 space-y-3">
        {isLoading && <div className="text-center text-white/60 py-10 text-sm">กำลังโหลด...</div>}
        {!isLoading && tickets?.length === 0 && (
          <div className="text-center py-10 text-white/60 text-sm">
            <div className="text-4xl mb-2">✅</div>
            ไม่มีงานค้าง
          </div>
        )}
        {tickets?.map((t) => <TicketCard key={t.id} t={t} />)}
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
