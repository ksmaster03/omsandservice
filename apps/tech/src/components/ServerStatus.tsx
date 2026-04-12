import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface StatusData {
  status: 'up' | 'degraded' | 'down';
  api: string;
  db: string;
  dbLatencyMs: number | null;
  cpu: { cores: number; load1m: number; usedPct: number };
  mem: { totalMb: number; usedMb: number; usedPct: number };
  uptimeSec: number;
}

function deriveHealthUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return base.replace(/\/api\/v\d+$/, '') + '/health/status';
}

export default function ServerStatus() {
  const { t } = useTranslation();
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch(deriveHealthUrl());
        if (!res.ok) throw new Error('bad');
        const json = await res.json();
        if (!cancelled) { setData(json.data as StatusData); setError(false); }
      } catch {
        if (!cancelled) { setData(null); setError(true); }
      }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const color =
    error || !data ? 'bg-gray-400'
    : data.status === 'up' ? 'bg-status-success'
    : data.status === 'degraded' ? 'bg-brand-gold'
    : 'bg-brand-red';

  const statusText = error
    ? t('status.unreachable')
    : !data ? t('status.checking')
    : data.status === 'up' ? t('status.up')
    : data.status === 'degraded' ? t('status.degraded')
    : t('status.down');

  return (
    <div className="bg-white/5 border border-white/10 rounded-brand text-xs text-white/80 overflow-hidden">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition">
        <div className="inline-flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color} ${!error && data?.status === 'up' ? 'animate-pulse' : ''}`} />
          <span className="font-semibold">{statusText}</span>
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-[10px] text-white/50 font-mono">{formatUptime(data.uptimeSec)}</span>}
          <span className={`material-symbols-outlined !text-[16px] text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
        </div>
      </button>
      {expanded && data && (
        <div className="grid grid-cols-3 gap-2 text-[10px] px-3 pb-3 pt-1 border-t border-white/10">
          <M label="API" value={data.api === 'up' ? '✓' : '✗'} good={data.api === 'up'} />
          <M label="DB" value={data.db === 'up' ? `${data.dbLatencyMs ?? '?'}ms` : '✗'} good={data.db === 'up'} />
          <M label="CPU" value={`${data.cpu.usedPct}%`} good={data.cpu.usedPct < 80} />
          <M label="RAM" value={`${data.mem.usedPct}%`} good={data.mem.usedPct < 80} />
          <M label="Cores" value={String(data.cpu.cores)} good />
          <M label="Used" value={`${data.mem.usedMb}MB`} good={data.mem.usedPct < 80} />
        </div>
      )}
    </div>
  );
}

function M({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-white/40">{label}</span>
      <span className={`font-mono font-semibold ${good ? 'text-white' : 'text-brand-gold'}`}>{value}</span>
    </div>
  );
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
