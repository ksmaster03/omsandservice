/**
 * Customer PWA data routes — everything scoped to the logged-in customer.
 *
 * Every query filters by `req.customerSession.customerId` so a customer
 * can ONLY ever see their own assets + tickets + renewals. This is the
 * critical security boundary for the PWA.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  customerCreateTicketSchema,
  warrantyStatus,
  RMA_REASONS,
} from '@oms/shared';
import { prisma } from '../lib/prisma';
import { nextTicketNo, nextRmaNo, makeBusinessKey } from '../lib/doc-no';

const customerDataRoutes: FastifyPluginAsync = async (app) => {
  // Every route requires a customer session
  app.addHook('preHandler', app.authenticateCustomer);

  // ─── GET /customer/assets ─── my equipment list
  app.get('/assets', async (req) => {
    const { customerId } = req.customerSession!;
    const now = new Date();
    const assets = await prisma.asset.findMany({
      where: { customerId },
      orderBy: { installedAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, brand: true, sku: true, warrantyMonths: true, pmIntervalMonths: true } },
        _count: { select: { tickets: true, pmSchedules: true } },
      },
    });
    const enriched = assets.map((a) => ({
      ...a,
      warrantyStatus: warrantyStatus(a.warrantyEnd, now),
      warrantyDaysLeft: Math.ceil((a.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }));
    return { ok: true, data: enriched };
  });

  // ─── GET /customer/assets/:id ─── detail
  app.get<{ Params: { id: string } }>('/assets/:id', async (req, reply) => {
    const { customerId } = req.customerSession!;
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, customerId },
      include: {
        product: true,
        pmSchedules: { orderBy: { scheduledAt: 'desc' } },
        tickets: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!asset) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }
    const now = new Date();
    return {
      ok: true,
      data: {
        ...asset,
        warrantyStatus: warrantyStatus(asset.warrantyEnd, now),
        warrantyDaysLeft: Math.ceil((asset.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      },
    };
  });

  // ─── GET /customer/tickets ─── my tickets
  app.get('/tickets', async (req) => {
    const { customerId } = req.customerSession!;
    const tickets = await prisma.serviceTicket.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { include: { product: { select: { id: true, name: true, sku: true } } } },
        tech: { select: { id: true, name: true, phone: true } },
      },
    });
    return { ok: true, data: tickets };
  });

  // ─── GET /customer/tickets/:id ─── with full timeline
  app.get<{ Params: { id: string } }>('/tickets/:id', async (req, reply) => {
    const { customerId } = req.customerSession!;
    const ticket = await prisma.serviceTicket.findFirst({
      where: { id: req.params.id, customerId },
      include: {
        asset: { include: { product: true } },
        tech: { select: { id: true, name: true, phone: true } },
        events: { orderBy: { createdAt: 'asc' } },
        photos: true,
      },
    });
    if (!ticket) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    return { ok: true, data: ticket };
  });

  // ─── POST /customer/tickets ─── create new ticket for my asset
  app.post('/tickets', async (req, reply) => {
    const parsed = customerCreateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { customerId } = req.customerSession!;
    const input = parsed.data;

    // Verify asset belongs to this customer
    const asset = await prisma.asset.findFirst({
      where: { id: input.assetId, customerId },
    });
    if (!asset) {
      return reply.code(403).send({
        ok: false,
        error: { code: 'NOT_YOUR_ASSET', message: 'Asset not linked to your account' },
      });
    }

    const ticketNo = await nextTicketNo();
    const slaHours = input.priority === 'URGENT' ? 4 : input.priority === 'NORMAL' ? 24 : 72;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNo,
        customerId,
        assetId: input.assetId,
        problemType: input.problemType,
        priority: input.priority,
        description: input.description,
        locationDetail: input.locationDetail,
        stage: 'RECEIVED',
        slaDueAt,
        events: {
          create: {
            stage: 'RECEIVED',
            note: 'แจ้งซ่อมผ่าน Customer PWA',
          },
        },
      },
      include: {
        asset: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return reply.code(201).send({ ok: true, data: ticket });
  });

  // ─── GET /customer/notifications ─── my notifications (MVP: static from DB)
  app.get('/notifications', async (req) => {
    const session = req.customerSession!;
    const items = await prisma.notification.findMany({
      where: { customerUserId: session.customerUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ok: true, data: items };
  });

  // ─── POST /customer/notifications/:id/read ───
  app.post<{ Params: { id: string } }>('/notifications/:id/read', async (req, reply) => {
    const session = req.customerSession!;
    try {
      const n = await prisma.notification.updateMany({
        where: { id: req.params.id, customerUserId: session.customerUserId },
        data: { readAt: new Date() },
      });
      if (n.count === 0) {
        return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      }
      return { ok: true, data: { updated: true } };
    } catch {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
  });

  // ─── GET /customer/rmas ─── my return requests
  app.get('/rmas', async (req) => {
    const { customerId } = req.customerSession!;
    const items = await prisma.rma.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            serialNo: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
    return { ok: true, data: items };
  });

  // ─── POST /customer/rmas ─── customer-initiated return request
  const customerCreateRmaSchema = z.object({
    assetId: z.string().uuid(),
    reason: z.enum(RMA_REASONS),
    description: z.string().min(5).max(2000),
  });
  app.post('/rmas', async (req, reply) => {
    const parsed = customerCreateRmaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const { customerId } = req.customerSession!;

    // Asset must belong to this customer
    const asset = await prisma.asset.findFirst({
      where: { id: parsed.data.assetId, customerId },
    });
    if (!asset) {
      return reply.code(403).send({
        ok: false,
        error: { code: 'NOT_YOUR_ASSET', message: 'Asset not linked to your account' },
      });
    }

    const rmaNo = await nextRmaNo();
    const businessKey = makeBusinessKey('rma', rmaNo);
    const rma = await prisma.rma.create({
      data: {
        rmaNo,
        businessKey,
        customerId,
        assetId: parsed.data.assetId,
        soId: asset.soId,
        reason: parsed.data.reason,
        description: parsed.data.description,
        stage: 'REQUESTED',
        events: {
          create: {
            stage: 'REQUESTED',
            note: 'แจ้งผ่าน Customer PWA',
          },
        },
      },
    });
    return reply.code(201).send({ ok: true, data: rma });
  });

  // ─── GET /customer/renewals ─── my warranty renewal offers
  app.get('/renewals', async (req) => {
    const { customerId } = req.customerSession!;
    const items = await prisma.warrantyRenewal.findMany({
      where: { asset: { customerId } },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    return { ok: true, data: items };
  });
};

export default customerDataRoutes;
