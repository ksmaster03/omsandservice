import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createTicketSchema,
  updateTicketStageSchema,
  PROBLEM_TYPES,
  PRIORITIES,
  TICKET_STAGES,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { paginate, toPrismaPagination } from '../lib/pagination';
import { listQuerySchema } from '@oms/shared';
import { nextTicketNo } from '../lib/doc-no';
import { saveUpload, isAllowedImage } from '../lib/storage';

const ticketListQuerySchema = listQuerySchema.extend({
  stage: z.enum(TICKET_STAGES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTechId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

// Staff creation schema — customerId required since staff can create for any customer
const staffCreateTicketSchema = z.object({
  customerId: z.string().uuid(),
  assetId: z.string().uuid(),
  problemType: z.enum(PROBLEM_TYPES),
  priority: z.enum(PRIORITIES),
  description: z.string().min(5).max(2000),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAddress: z.string().max(500).optional(),
  locationDetail: z.string().max(500).optional(),
});

const assignTicketSchema = z.object({
  techId: z.string().uuid(),
});

const slaHoursByPriority: Record<string, number> = {
  URGENT: 4,
  NORMAL: 24,
  LOW: 72,
};

const ticketRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /tickets ───
  app.get('/', async (req, reply) => {
    const parsed = ticketListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid query', details: parsed.error.flatten() },
      });
    }
    const q = parsed.data;

    const where: Record<string, unknown> = {};
    if (q.stage) where.stage = q.stage;
    if (q.priority) where.priority = q.priority;
    if (q.assignedTechId) where.assignedTechId = q.assignedTechId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.search) {
      where.OR = [
        { ticketNo: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.serviceTicket.findMany({
        where,
        ...toPrismaPagination(q),
        orderBy: { createdAt: q.order },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          asset: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          tech: { select: { id: true, name: true, phone: true } },
          _count: { select: { photos: true, events: true } },
        },
      }),
      prisma.serviceTicket.count({ where }),
    ]);

    return { ok: true, data: paginate(items, total, q) };
  });

  // ─── GET /tickets/:id ───
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        asset: { include: { product: true } },
        tech: { select: { id: true, name: true, email: true, phone: true } },
        photos: true,
        video: true,
        events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { id: true, name: true } } } },
      },
    });
    if (!ticket) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    return { ok: true, data: ticket };
  });

  // ─── POST /tickets ─── staff creates a ticket
  app.post('/', { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] }, async (req, reply) => {
    const parsed = staffCreateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const input = parsed.data;

    // Verify asset belongs to customer
    const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset || asset.customerId !== input.customerId) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'ASSET_MISMATCH', message: 'Asset does not belong to this customer' },
      });
    }

    const ticketNo = await nextTicketNo();
    const slaDueAt = new Date(
      Date.now() + slaHoursByPriority[input.priority]! * 60 * 60 * 1000,
    );

    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNo,
        customerId: input.customerId,
        assetId: input.assetId,
        problemType: input.problemType,
        priority: input.priority,
        description: input.description,
        locationLat: input.locationLat,
        locationLng: input.locationLng,
        locationAddress: input.locationAddress,
        locationDetail: input.locationDetail,
        stage: 'RECEIVED',
        slaDueAt,
        events: {
          create: {
            stage: 'RECEIVED',
            note: 'Ticket created',
            actorId: req.authUser!.id,
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        asset: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return reply.code(201).send({ ok: true, data: ticket });
  });

  // ─── POST /tickets/:id/assign ───
  app.post<{ Params: { id: string } }>(
    '/:id/assign',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] },
    async (req, reply) => {
      const parsed = assignTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'techId required' },
        });
      }
      try {
        const ticket = await prisma.serviceTicket.update({
          where: { id: req.params.id },
          data: {
            assignedTechId: parsed.data.techId,
            stage: 'ASSIGNED',
            events: {
              create: {
                stage: 'ASSIGNED',
                note: 'Assigned to technician',
                actorId: req.authUser!.id,
              },
            },
          },
        });
        return { ok: true, data: ticket };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
    },
  );

  // ─── POST /tickets/:id/stage ─── generic stage transition
  app.post<{ Params: { id: string } }>(
    '/:id/stage',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] },
    async (req, reply) => {
      const parsed = updateTicketStageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
        });
      }
      try {
        const data: Record<string, unknown> = {
          stage: parsed.data.stage,
          events: {
            create: {
              stage: parsed.data.stage,
              note: parsed.data.note ?? null,
              actorId: req.authUser!.id,
            },
          },
        };
        if (parsed.data.stage === 'CLOSED') {
          data.closedAt = new Date();
        }
        const ticket = await prisma.serviceTicket.update({
          where: { id: req.params.id },
          data,
        });
        return { ok: true, data: ticket };
      } catch {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
    },
  );

  // ─── POST /tickets/:id/photos ─── multipart upload
  app.post<{ Params: { id: string } }>(
    '/:id/photos',
    { preHandler: [app.requireRole('SERVICE', 'ADMIN') ] },
    async (req, reply) => {
      const ticket = await prisma.serviceTicket.findUnique({ where: { id: req.params.id } });
      if (!ticket) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }

      const parts = req.parts();
      const saved = [];
      for await (const part of parts) {
        if (part.type === 'file') {
          if (!isAllowedImage(part.mimetype)) {
            return reply.code(400).send({
              ok: false,
              error: { code: 'BAD_MIME', message: `Unsupported mime type: ${part.mimetype}` },
            });
          }
          const stored = await saveUpload('tickets', ticket.id, part);
          const photo = await prisma.ticketPhoto.create({
            data: { ticketId: ticket.id, s3Key: stored.key, size: stored.size },
          });
          saved.push(photo);
        }
      }
      if (saved.length === 0) {
        return reply.code(400).send({
          ok: false,
          error: { code: 'NO_FILES', message: 'No files uploaded' },
        });
      }
      return { ok: true, data: saved };
    },
  );
};

export default ticketRoutes;
