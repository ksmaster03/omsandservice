import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

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
};

export default healthRoutes;
