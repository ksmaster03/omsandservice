import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const sparePartRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => {
    const items = await prisma.sparePart.findMany({ orderBy: { partNo: 'asc' } });
    return { ok: true, data: items };
  });

  app.post('/', { preHandler: [app.requireRole('ADMIN', 'SERVICE')] }, async (req, reply) => {
    const schema = z.object({
      partNo: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      category: z.string().max(50).optional(),
      unit: z.string().max(10).default('EA'),
      costPrice: z.number().optional(),
      sellPrice: z.number().optional(),
      onHand: z.number().int().min(0).default(0),
      reorderAt: z.number().int().min(0).default(0),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    const part = await prisma.sparePart.create({ data: parsed.data });
    return reply.code(201).send({ ok: true, data: part });
  });

  app.patch<{ Params: { id: string } }>('/:id', { preHandler: [app.requireRole('ADMIN', 'SERVICE')] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().max(200).optional(),
      category: z.string().max(50).optional(),
      costPrice: z.number().optional(),
      sellPrice: z.number().optional(),
      onHand: z.number().int().min(0).optional(),
      reorderAt: z.number().int().min(0).optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });
    const part = await prisma.sparePart.update({ where: { id: req.params.id }, data: parsed.data });
    return { ok: true, data: part };
  });

  app.post<{ Params: { id: string } }>('/:id/use', async (req, reply) => {
    const schema = z.object({
      qty: z.number().int().min(1),
      ticketId: z.string().uuid().optional(),
      rmaId: z.string().uuid().optional(),
      pmId: z.string().uuid().optional(),
      note: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: { code: 'VALIDATION', message: 'Invalid input' } });

    const part = await prisma.sparePart.findUnique({ where: { id: req.params.id } });
    if (!part) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Spare part not found' } });
    if (part.onHand < parsed.data.qty) {
      return reply.code(409).send({ ok: false, error: { code: 'INSUFFICIENT_STOCK', message: `Only ${part.onHand} available` } });
    }

    const [usage] = await prisma.$transaction([
      prisma.sparePartUsage.create({
        data: { sparePartId: part.id, ...parsed.data, techId: req.authUser!.id },
      }),
      prisma.sparePart.update({
        where: { id: part.id },
        data: { onHand: { decrement: parsed.data.qty } },
      }),
    ]);
    return reply.code(201).send({ ok: true, data: usage });
  });

  app.get<{ Params: { id: string } }>('/:id/usage', async (req) => {
    const usages = await prisma.sparePartUsage.findMany({
      where: { sparePartId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ok: true, data: usages };
  });
};

export default sparePartRoutes;
