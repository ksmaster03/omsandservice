import type { FastifyPluginAsync } from 'fastify';
import {
  assignInstallSchema,
  completeInstallSchema,
  installListQuerySchema,
  scheduleInstallSchema,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';
import { saveUpload, isAllowedImage } from '../lib/storage';

const installationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /installations ───
  app.get('/', async (req, reply) => {
    const parsed = installListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.techId) where.techId = q.techId;
    if (q.search) {
      where.so = { soNo: { contains: q.search, mode: 'insensitive' } };
    }

    const [items, total] = await Promise.all([
      prisma.installation.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { scheduledAt: q.order },
        include: {
          so: {
            select: {
              id: true,
              soNo: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          tech: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.installation.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /installations/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const inst = await prisma.installation.findUnique({
      where: { id: req.params.id },
      include: {
        so: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
        tech: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!inst) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Installation not found' } });
    }
    return { ok: true, data: inst };
  });

  // ─── POST /installations ─── schedule a new install from SO
  // Idempotent via so_id unique — returns existing if already scheduled
  app.post('/', { preHandler: [app.requireRole('SALES', 'ADMIN')] }, async (req, reply) => {
    const parsed = scheduleInstallSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { soId, scheduledAt, techId } = parsed.data;

    const existing = await prisma.installation.findUnique({ where: { soId } });
    if (existing) {
      return reply.code(409).send({
        ok: false,
        error: { code: 'ALREADY_SCHEDULED', message: 'Installation already exists for this SO', installationId: existing.id },
      });
    }

    const so = await prisma.salesOrder.findUnique({ where: { id: soId } });
    if (!so) {
      return reply.code(404).send({ ok: false, error: { code: 'SO_NOT_FOUND', message: 'Sales order not found' } });
    }

    const inst = await prisma.installation.create({
      data: {
        soId,
        scheduledAt: new Date(scheduledAt),
        techId: techId ?? null,
        status: techId ? 'SCHEDULED' : 'SCHEDULED',
      },
    });
    return reply.code(201).send({ ok: true, data: inst });
  });

  // ─── POST /installations/:id/assign ─── (INSTALL + ADMIN)
  app.post<{ Params: { id: string } }>(
    '/:id/assign',
    { preHandler: [app.requireRole('INSTALL', 'ADMIN')] },
    async (req, reply) => {
      const parsed = assignInstallSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const inst = await prisma.installation.update({
          where: { id: req.params.id },
          data: {
            techId: parsed.data.techId,
            scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
            status: 'SCHEDULED',
          },
        });
        return { ok: true, data: inst };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Installation not found' } });
      }
    },
  );

  // ─── POST /installations/:id/photos ─── multipart upload
  app.post<{ Params: { id: string } }>(
    '/:id/photos',
    { preHandler: [app.requireRole('INSTALL', 'ADMIN')] },
    async (req, reply) => {
      const inst = await prisma.installation.findUnique({ where: { id: req.params.id } });
      if (!inst) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Installation not found' } });
      }

      const parts = req.parts();
      const saved: string[] = [];
      for await (const part of parts) {
        if (part.type === 'file') {
          if (!isAllowedImage(part.mimetype)) {
            return reply.code(400).send({
              ok: false,
              error: { code: 'BAD_MIME', message: `Unsupported mime type: ${part.mimetype}` },
            });
          }
          const stored = await saveUpload('installs', inst.id, part);
          saved.push(stored.key);
        }
      }

      if (saved.length === 0) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'NO_FILES', message: 'No files uploaded' },
        });
      }

      const updated = await prisma.installation.update({
        where: { id: inst.id },
        data: { photos: { set: [...inst.photos, ...saved] } },
      });
      return { ok: true, data: { added: saved, photos: updated.photos } };
    },
  );

  // ─── POST /installations/:id/complete ─── the big one
  // Creates Assets (1 per serial), calculates warrantyEnd + nextPmDate,
  // creates first PmSchedule for each asset, sets SO status INSTALLED.
  app.post<{ Params: { id: string } }>(
    '/:id/complete',
    { preHandler: [app.requireRole('INSTALL', 'ADMIN')] },
    async (req, reply) => {
      const parsed = completeInstallSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      const input = parsed.data;

      const inst = await prisma.installation.findUnique({
        where: { id: req.params.id },
        include: {
          so: {
            include: {
              items: { include: { product: true } },
            },
          },
        },
      });
      if (!inst) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Installation not found' } });
      }
      if (inst.status === 'COMPLETED') {
        return reply.code(409).send({
          ok: false,
          error: { code: 'ALREADY_COMPLETED', message: 'Installation already completed' },
        });
      }

      // Validate each soItemId belongs to this install's SO
      const itemMap = new Map(inst.so.items.map((it) => [it.id, it]));
      for (const a of input.assets) {
        if (!itemMap.has(a.soItemId)) {
          return reply.code(400).send({
            ok: false,
            error: { code: 'BAD_SO_ITEM', message: `SO item ${a.soItemId} not in this installation` },
          });
        }
      }

      const now = new Date();
      const day = 24 * 60 * 60 * 1000;

      // Build assets + first PM schedules in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1) Mark install complete + set SO to INSTALLED
        await tx.installation.update({
          where: { id: inst.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            note: input.note ?? undefined,
          },
        });
        await tx.salesOrder.update({
          where: { id: inst.soId },
          data: { status: 'INSTALLED' },
        });

        // 2) Create one Asset per serial provided
        const createdAssets = [];
        for (const a of input.assets) {
          const item = itemMap.get(a.soItemId)!;
          const warrantyEnd = new Date(
            now.getTime() + item.product.warrantyMonths * 30 * day,
          );
          const nextPmDate = new Date(
            now.getTime() + item.product.pmIntervalMonths * 30 * day,
          );

          const asset = await tx.asset.create({
            data: {
              serialNo: a.serialNo,
              productId: item.productId,
              customerId: inst.so.customerId,
              soId: inst.soId,
              installedAt: now,
              warrantyEnd,
              nextPmDate,
              locationDetail: input.locationDetail ?? null,
            },
          });

          // 3) First PM schedule
          await tx.pmSchedule.create({
            data: {
              assetId: asset.id,
              scheduledAt: nextPmDate,
              status: 'PENDING',
            },
          });

          createdAssets.push(asset);
        }

        return createdAssets;
      });

      return reply.code(200).send({
        ok: true,
        data: {
          installation: { id: inst.id, status: 'COMPLETED', completedAt: now },
          createdAssets: result,
        },
      });
    },
  );
};

export default installationRoutes;
