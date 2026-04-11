/**
 * Tech-facing routes used by the Tech PWA.
 *
 * These are scoped to logged-in INSTALL and SERVICE staff — they can only
 * see and update their own assigned tickets + PM jobs, and send GPS pings
 * while on active jobs.
 *
 * Sprint 4 keeps it focused on the happy path:
 *   - list my tickets
 *   - update stage (EN_ROUTE → ARRIVED → REPAIRING → CLOSED)
 *   - ping GPS location (throttled by gps_interval_seconds setting)
 */
import type { FastifyPluginAsync } from 'fastify';
import { techLocationPingSchema, updateTicketStageSchema } from '@oms/shared';
import { prisma } from '../lib/prisma';

const techRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('INSTALL', 'SERVICE', 'ADMIN'));

  // ─── GET /tech/me/tickets ─── my assigned tickets (not closed)
  app.get('/me/tickets', async (req) => {
    const techId = req.authUser!.id;
    const tickets = await prisma.serviceTicket.findMany({
      where: {
        assignedTechId: techId,
        stage: { notIn: ['CLOSED', 'CANCELLED'] },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
        asset: {
          include: { product: { select: { id: true, name: true, sku: true, brand: true } } },
        },
      },
    });
    return { ok: true, data: tickets };
  });

  // ─── GET /tech/me/pm ─── my assigned PM jobs (not completed)
  app.get('/me/pm', async (req) => {
    const techId = req.authUser!.id;
    const pms = await prisma.pmSchedule.findMany({
      where: {
        techId,
        status: { in: ['SCHEDULED', 'PENDING'] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        asset: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            customer: { select: { id: true, name: true, phone: true, address: true } },
          },
        },
      },
    });
    return { ok: true, data: pms };
  });

  // ─── POST /tech/tickets/:id/stage ─── update my ticket stage
  //     (same as /internal but scoped to "my" tickets)
  app.post<{ Params: { id: string } }>('/tickets/:id/stage', async (req, reply) => {
    const parsed = updateTicketStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: req.params.id },
    });
    if (!ticket) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    if (ticket.assignedTechId !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
      return reply.code(403).send({
        ok: false,
        error: { code: 'NOT_OWNER', message: 'Not your ticket' },
      });
    }

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

    const updated = await prisma.serviceTicket.update({
      where: { id: ticket.id },
      data,
    });
    return { ok: true, data: updated };
  });

  // ─── POST /tech/location ─── GPS ping (called every gps_interval_seconds)
  app.post('/location', async (req, reply) => {
    const parsed = techLocationPingSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }
    const techId = req.authUser!.id;
    await prisma.techLocation.upsert({
      where: { techId },
      create: {
        techId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        accuracy: parsed.data.accuracy ?? null,
        activeTicketId: parsed.data.activeTicketId ?? null,
      },
      update: {
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        accuracy: parsed.data.accuracy ?? null,
        activeTicketId: parsed.data.activeTicketId ?? null,
      },
    });
    return { ok: true, data: { ok: true } };
  });

  // ─── GET /tech/settings ─── pull Admin-configurable settings
  //     (specifically gps_interval_seconds so tech PWA knows how often to ping)
  app.get('/settings', async () => {
    const keys = ['gps_interval_seconds', 'gps_tracking_expiry_minutes'];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return { ok: true, data: out };
  });
};

export default techRoutes;
