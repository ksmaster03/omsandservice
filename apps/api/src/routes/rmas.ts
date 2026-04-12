import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  RMA_REASONS,
  RMA_STAGES,
  canTransitionRma,
  type RmaStage,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';
import { listQuerySchema } from '@oms/shared';
import { nextRmaNo, makeBusinessKey } from '../lib/doc-no';
import { bus } from '../lib/events';

const createRmaSchema = z.object({
  customerId: z.string().uuid(),
  assetId: z.string().uuid(),
  reason: z.enum(RMA_REASONS),
  description: z.string().min(5).max(2000),
});

const updateStageSchema = z.object({
  stage: z.enum(RMA_STAGES),
  note: z.string().max(1000).optional(),
  /** Optional fields that apply depending on target stage */
  pickupAt: z.string().datetime().optional(),
  techId: z.string().uuid().optional(),
  refundAmount: z.number().positive().optional(),
  replacementAssetId: z.string().uuid().optional(),
});

const rmaListQuerySchema = listQuerySchema.extend({
  stage: z.enum(RMA_STAGES).optional(),
  customerId: z.string().uuid().optional(),
});

const rmaRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /rmas ───
  app.get('/', async (req, reply) => {
    const parsed = rmaListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;
    const where: Record<string, unknown> = {};
    if (q.stage) where.stage = q.stage;
    if (q.customerId) where.customerId = q.customerId;

    const [items, total] = await Promise.all([
      prisma.rma.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          asset: {
            select: {
              id: true,
              serialNo: true,
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          tech: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.rma.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /rmas/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const rma = await prisma.rma.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        asset: { include: { product: true } },
        tech: { select: { id: true, name: true, phone: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!rma) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'RMA not found' } });
    }
    return { ok: true, data: rma };
  });

  // ─── POST /rmas ─── create a return request
  app.post('/', { preHandler: [app.requireRole('SALES', 'SERVICE', 'ADMIN')] }, async (req, reply) => {
    const parsed = createRmaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const input = parsed.data;

    const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset || asset.customerId !== input.customerId) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'ASSET_MISMATCH', message: 'Asset does not belong to this customer' },
      });
    }

    const rmaNo = await nextRmaNo();
    const businessKey = makeBusinessKey('rma', rmaNo);
    const rma = await prisma.rma.create({
      data: {
        rmaNo,
        businessKey,
        customerId: input.customerId,
        assetId: input.assetId,
        soId: asset.soId,
        reason: input.reason,
        description: input.description,
        stage: 'REQUESTED',
        createdById: req.authUser!.id,
        events: {
          create: {
            stage: 'REQUESTED',
            note: 'RMA created',
            actorId: req.authUser!.id,
          },
        },
      },
    });
    return reply.code(201).send({ ok: true, data: rma });
  });

  // ─── POST /rmas/:id/stage ─── transition (ADMIN + SERVICE)
  app.post<{ Params: { id: string } }>(
    '/:id/stage',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN')] },
    async (req, reply) => {
      const parsed = updateStageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      const current = await prisma.rma.findUnique({
        where: { id: req.params.id },
        select: { stage: true },
      });
      if (!current) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'RMA not found' } });
      }

      if (!canTransitionRma(current.stage as RmaStage, parsed.data.stage as RmaStage)) {
        return reply.code(409).send({
          ok: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Invalid transition: ${current.stage} → ${parsed.data.stage}`,
            from: current.stage,
            to: parsed.data.stage,
          },
        });
      }

      const updates: Record<string, unknown> = {
        stage: parsed.data.stage,
        events: {
          create: {
            stage: parsed.data.stage,
            note: parsed.data.note ?? null,
            actorId: req.authUser!.id,
          },
        },
      };

      // Timestamp + resolution bookkeeping per transition
      switch (parsed.data.stage) {
        case 'PICKUP_SCHEDULED':
          if (parsed.data.pickupAt) updates.pickupAt = new Date(parsed.data.pickupAt);
          if (parsed.data.techId) updates.techId = parsed.data.techId;
          break;
        case 'PICKED_UP':
          updates.pickedUpAt = new Date();
          break;
        case 'INSPECTING':
          // nothing extra
          break;
        case 'REFUNDED':
          updates.inspectedAt = new Date();
          updates.closedAt = new Date();
          updates.resolution = 'REFUND';
          if (parsed.data.refundAmount !== undefined) updates.refundAmount = parsed.data.refundAmount;
          break;
        case 'REPLACED':
          updates.inspectedAt = new Date();
          updates.closedAt = new Date();
          updates.resolution = 'REPLACE';
          if (parsed.data.replacementAssetId) updates.replacementAssetId = parsed.data.replacementAssetId;
          break;
        case 'REFURBISHED':
          updates.inspectedAt = new Date();
          updates.closedAt = new Date();
          updates.resolution = 'REFURBISH';
          break;
        case 'REJECTED':
          updates.closedAt = new Date();
          updates.resolution = 'REJECTED';
          break;
        case 'CANCELLED':
          updates.closedAt = new Date();
          break;
      }

      const rma = await prisma.rma.update({
        where: { id: req.params.id },
        data: updates,
      });

      bus.emit('rma.stage_changed', {
        rmaId: rma.id,
        rmaNo: rma.rmaNo,
        customerId: rma.customerId,
        from: current.stage,
        to: parsed.data.stage,
      });

      return { ok: true, data: rma };
    },
  );
};

export default rmaRoutes;
