/**
 * Customer 360 — single endpoint that aggregates ALL data
 * for one customer: quotes, SOs, installations, assets, tickets,
 * PM schedules, renewals, RMAs — sorted as a unified timeline.
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

const customer360Routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get<{ Params: { id: string } }>('/:id/360', async (req, reply) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, displayName: true, phone: true, email: true } },
      },
    });
    if (!customer) {
      return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    const [leads, quotations, salesOrders, installations, assets, tickets, pmSchedules, renewals, rmas] = await Promise.all([
      prisma.lead.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, stage: true, value: true, note: true, createdAt: true },
      }),
      prisma.quotation.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, quoteNo: true, status: true, total: true, createdAt: true },
      }),
      prisma.salesOrder.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, soNo: true, status: true, total: true, createdAt: true },
      }),
      prisma.installation.findMany({
        where: { so: { customerId: req.params.id } },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        select: { id: true, status: true, scheduledAt: true, completedAt: true, so: { select: { soNo: true } } },
      }),
      prisma.asset.findMany({
        where: { customerId: req.params.id },
        orderBy: { installedAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, brand: true } },
        },
      }),
      prisma.serviceTicket.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, ticketNo: true, problemType: true, priority: true,
          stage: true, slaDueAt: true, closedAt: true, createdAt: true,
          customerRating: true,
          asset: { select: { serialNo: true, product: { select: { name: true } } } },
        },
      }),
      prisma.pmSchedule.findMany({
        where: { asset: { customerId: req.params.id } },
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        select: {
          id: true, status: true, scheduledAt: true, completedAt: true,
          asset: { select: { serialNo: true, product: { select: { name: true } } } },
        },
      }),
      prisma.warrantyRenewal.findMany({
        where: { asset: { customerId: req.params.id } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, status: true, price: true, createdAt: true },
      }),
      prisma.rma.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, rmaNo: true, stage: true, reason: true, createdAt: true },
      }),
    ]);

    // Build unified timeline
    type TimelineItem = { date: string; type: string; title: string; detail?: string; status?: string; id: string };
    const timeline: TimelineItem[] = [];

    for (const l of leads) timeline.push({ date: l.createdAt.toISOString(), type: 'lead', title: `Lead ฿${Number(l.value).toLocaleString()}`, status: l.stage, detail: l.note ?? undefined, id: l.id });
    for (const q of quotations) timeline.push({ date: q.createdAt.toISOString(), type: 'quote', title: `Quote ${q.quoteNo}`, status: q.status, detail: `฿${Number(q.total).toLocaleString()}`, id: q.id });
    for (const s of salesOrders) timeline.push({ date: s.createdAt.toISOString(), type: 'so', title: `SO ${s.soNo}`, status: s.status, detail: `฿${Number(s.total).toLocaleString()}`, id: s.id });
    for (const i of installations) timeline.push({ date: (i.completedAt ?? i.scheduledAt).toISOString(), type: 'install', title: `ติดตั้ง ${i.so.soNo}`, status: i.status, id: i.id });
    for (const t of tickets) timeline.push({ date: t.createdAt.toISOString(), type: 'ticket', title: `${t.ticketNo} — ${t.problemType}`, status: t.stage, detail: t.asset?.product?.name, id: t.id });
    for (const p of pmSchedules) timeline.push({ date: p.scheduledAt.toISOString(), type: 'pm', title: `PM ${p.asset.product.name}`, status: p.status, detail: p.asset.serialNo, id: p.id });
    for (const r of renewals) timeline.push({ date: r.createdAt.toISOString(), type: 'renewal', title: `ต่อประกัน ${r.type}`, status: r.status, detail: `฿${Number(r.price).toLocaleString()}`, id: r.id });
    for (const rm of rmas) timeline.push({ date: rm.createdAt.toISOString(), type: 'rma', title: `RMA ${rm.rmaNo}`, status: rm.stage, detail: rm.reason, id: rm.id });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Summary stats
    const now = new Date();
    const summary = {
      totalAssets: assets.length,
      activeWarranty: assets.filter((a) => a.warrantyEnd > now).length,
      openTickets: tickets.filter((t) => !['CLOSED', 'CANCELLED'].includes(t.stage)).length,
      totalRevenue: salesOrders.reduce((sum, s) => sum + Number(s.total), 0),
      avgRating: tickets.filter((t) => t.customerRating).length > 0
        ? Number((tickets.filter((t) => t.customerRating).reduce((sum, t) => sum + (t.customerRating ?? 0), 0) / tickets.filter((t) => t.customerRating).length).toFixed(1))
        : null,
      pendingPm: pmSchedules.filter((p) => ['PENDING', 'SCHEDULED', 'OVERDUE'].includes(p.status)).length,
    };

    return {
      ok: true,
      data: {
        customer,
        summary,
        timeline: timeline.slice(0, 50),
        assets,
        leads,
        quotations,
        salesOrders,
        tickets,
        pmSchedules,
        renewals,
        rmas,
      },
    };
  });
};

export default customer360Routes;
