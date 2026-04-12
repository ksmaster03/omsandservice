import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import { prisma } from '../lib/prisma';

const startedAt = Date.now();

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return { ok: true, data: { status: 'up', time: new Date().toISOString() } };
  });

  app.get('/health/db', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, data: { db: 'up' } };
    } catch (err) {
      app.log.error(err);
      return { ok: false, error: { code: 'DB_DOWN', message: 'Database unreachable' } };
    }
  });

  // ─── GET /health/status ─── public service overview for login screens
  // Intentionally unauthenticated so users see health before they log in.
  // Reveals only high-level metrics; no secrets, no process internals.
  app.get('/health/status', async () => {
    // DB ping (short circuit on timeout)
    let dbOk = false;
    let dbLatencyMs: number | null = null;
    try {
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cores = os.cpus().length;
    const [load1] = os.loadavg();
    // Normalize 1-min load average to a 0-100% scale across all cores
    const cpuPct = Math.min(100, Math.round(((load1 ?? 0) / cores) * 100));
    const memPct = Math.round((usedMem / totalMem) * 100);

    // Classification for the UI dot
    let status: 'up' | 'degraded' | 'down' = 'up';
    if (!dbOk) status = 'down';
    else if (cpuPct > 90 || memPct > 90) status = 'degraded';

    return {
      ok: true,
      data: {
        status,
        api: 'up',
        db: dbOk ? 'up' : 'down',
        dbLatencyMs,
        cpu: {
          cores,
          load1m: Number((load1 ?? 0).toFixed(2)),
          usedPct: cpuPct,
        },
        mem: {
          totalMb: Math.round(totalMem / 1024 / 1024),
          usedMb: Math.round(usedMem / 1024 / 1024),
          usedPct: memPct,
        },
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        time: new Date().toISOString(),
      },
    };
  });
};

export default healthRoutes;
