import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { env, isDev } from './config/env';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import userRoutes from './routes/users';
import leadRoutes from './routes/leads';
import quotationRoutes from './routes/quotations';
import salesOrderRoutes from './routes/sales-orders';
import installationRoutes from './routes/installations';
import assetRoutes from './routes/assets';
import pmRoutes from './routes/pm-schedules';
import ticketRoutes from './routes/service-tickets';
import renewalRoutes from './routes/renewals';
import wmsRoutes from './routes/wms';
import reportsRoutes from './routes/reports';
import techRoutes from './routes/tech';
import { prisma } from './lib/prisma';
import { closeBrowser } from './lib/pdf';
import { getUploadRoot } from './lib/storage';
import { mkdir } from 'node:fs/promises';

export async function buildServer() {
  const app = Fastify({
    logger: isDev
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          },
        }
      : { level: 'info' },
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1 MB for JSON — multipart has its own limit
  });

  // Ensure upload dir exists before static serving
  await mkdir(getUploadRoot(), { recursive: true });

  // Core plugins
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((s: string) => s.trim()),
    credentials: true,
  });
  await app.register(sensible);
  if (env.RATE_LIMIT_MAX > 0) {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
    });
  }
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB hard limit (video ceiling)
      files: 5, // max 5 files per request (photo ceiling)
    },
  });
  await app.register(fastifyStatic, {
    root: getUploadRoot(),
    prefix: '/uploads/',
    decorateReply: false,
  });
  await app.register(authPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(customerRoutes, { prefix: '/api/v1/internal/customers' });
  await app.register(productRoutes, { prefix: '/api/v1/internal/products' });
  await app.register(userRoutes, { prefix: '/api/v1/internal/users' });
  await app.register(leadRoutes, { prefix: '/api/v1/internal/leads' });
  await app.register(quotationRoutes, { prefix: '/api/v1/internal/quotations' });
  await app.register(salesOrderRoutes, { prefix: '/api/v1/internal/sales-orders' });
  await app.register(installationRoutes, { prefix: '/api/v1/internal/installations' });
  await app.register(assetRoutes, { prefix: '/api/v1/internal/assets' });
  await app.register(pmRoutes, { prefix: '/api/v1/internal/pm-schedules' });
  await app.register(ticketRoutes, { prefix: '/api/v1/internal/tickets' });
  await app.register(renewalRoutes, { prefix: '/api/v1/internal/renewals' });
  await app.register(wmsRoutes, { prefix: '/api/v1/internal/wms' });
  await app.register(reportsRoutes, { prefix: '/api/v1/internal/reports' });
  await app.register(techRoutes, { prefix: '/api/v1/tech' });

  // Root
  app.get('/', async () => ({
    ok: true,
    data: {
      name: 'NBA Sport OMS API',
      version: '0.0.1',
      docs: '/docs (coming soon)',
    },
  }));

  return app;
}

async function start() {
  // Guard: don't auto-start when imported by tests
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return;
  const app = await buildServer();

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    app.log.info(`Received ${signal}, closing gracefully...`);
    await app.close();
    await closeBrowser();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void closeGracefully('SIGTERM'));
  process.on('SIGINT', () => void closeGracefully('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
