import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { env, isDev } from './config/env';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import authPlugin from './plugins/auth';
import websocketPlugin from './plugins/websocket';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import stockRoutes from './routes/stock';
import userRoutes from './routes/users';
import leadRoutes from './routes/leads';
import quotationRoutes from './routes/quotations';
import salesOrderRoutes from './routes/sales-orders';
import installationRoutes from './routes/installations';
import assetRoutes from './routes/assets';
import pmRoutes from './routes/pm-schedules';
import ticketRoutes from './routes/service-tickets';
import renewalRoutes from './routes/renewals';
import rmaRoutes from './routes/rmas';
import settingsRoutes from './routes/settings';
import feedbackRoutes from './routes/feedback';
import customer360Routes from './routes/customer-360';
import sparePartRoutes from './routes/spare-parts';
import serviceAgreementRoutes from './routes/service-agreements';
import wmsRoutes from './routes/wms';
import reportsRoutes from './routes/reports';
import techRoutes from './routes/tech';
import customerAuthRoutes from './routes/customer-auth';
import customerDataRoutes from './routes/customer-data';
import { prisma } from './lib/prisma';
import { closeBrowser } from './lib/pdf';
import { getUploadRoot } from './lib/storage';
import { registerEventHandlers } from './events/handlers';
import { sweepOrphanReservations } from './lib/stock';
import { checkSlaEscalation } from './lib/sla-escalation';
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

  // Wire domain event handlers once per process
  registerEventHandlers();

  // Periodic cleanup: sweep orphan stock reservations every 10 minutes.
  // Skipped under tests to keep them deterministic.
  if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
    setInterval(() => {
      sweepOrphanReservations()
        .then((res) => {
          if (res.released > 0) app.log.info({ res }, 'stock sweep: released orphan reservations');
        })
        .catch((err) => app.log.warn({ err }, 'stock sweep failed'));
    }, 10 * 60 * 1000).unref();

    // SLA escalation check every 15 minutes
    setInterval(() => {
      checkSlaEscalation()
        .then((res) => {
          if (res.warned + res.breached + res.critical > 0) {
            app.log.info({ res }, 'SLA check: escalations found');
          }
        })
        .catch((err) => app.log.warn({ err }, 'SLA check failed'));
    }, 15 * 60 * 1000).unref();
  }

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
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Toptier OSM API',
        description: 'Order & Service Management API',
        version: '2.23.0',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
  await app.register(authPlugin);
  await app.register(websocketPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(customerRoutes, { prefix: '/api/v1/internal/customers' });
  await app.register(customer360Routes, { prefix: '/api/v1/internal/customers' });
  await app.register(productRoutes, { prefix: '/api/v1/internal/products' });
  await app.register(stockRoutes, { prefix: '/api/v1/internal/stock' });
  await app.register(sparePartRoutes, { prefix: '/api/v1/internal/spare-parts' });
  await app.register(serviceAgreementRoutes, { prefix: '/api/v1/internal/service-agreements' });
  await app.register(userRoutes, { prefix: '/api/v1/internal/users' });
  await app.register(leadRoutes, { prefix: '/api/v1/internal/leads' });
  await app.register(quotationRoutes, { prefix: '/api/v1/internal/quotations' });
  await app.register(salesOrderRoutes, { prefix: '/api/v1/internal/sales-orders' });
  await app.register(installationRoutes, { prefix: '/api/v1/internal/installations' });
  await app.register(assetRoutes, { prefix: '/api/v1/internal/assets' });
  await app.register(pmRoutes, { prefix: '/api/v1/internal/pm-schedules' });
  await app.register(ticketRoutes, { prefix: '/api/v1/internal/tickets' });
  await app.register(renewalRoutes, { prefix: '/api/v1/internal/renewals' });
  await app.register(rmaRoutes, { prefix: '/api/v1/internal/rmas' });
  await app.register(settingsRoutes, { prefix: '/api/v1/internal/settings' });
  await app.register(feedbackRoutes, { prefix: '/api/v1/feedback' });
  await app.register(wmsRoutes, { prefix: '/api/v1/internal/wms' });
  await app.register(reportsRoutes, { prefix: '/api/v1/internal/reports' });
  await app.register(techRoutes, { prefix: '/api/v1/tech' });
  await app.register(customerAuthRoutes, { prefix: '/api/v1/customer/auth' });
  await app.register(customerDataRoutes, { prefix: '/api/v1/customer' });

  // Root
  app.get('/', async () => ({
    ok: true,
    data: {
      name: 'Toptier OSM API',
      version: '2.23.0',
      docs: '/docs',
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
