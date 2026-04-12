import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

/**
 * Reports / dashboard metrics.
 * Keep queries cheap — just counts, sums, groupBy. No raw SQL for now.
 */
const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // ─── GET /reports/summary ─── top-level KPIs for dashboard
  app.get('/summary', async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [
      customers,
      activeLeads,
      quotesMonth,
      salesOrdersMonth,
      soRevenueMonth,
      installsPending,
      assetsTotal,
      ticketsOpen,
      warrantyExpiring,
      pmDueSoon,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.lead.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
      prisma.quotation.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.salesOrder.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.salesOrder.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.installation.count({
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      }),
      prisma.asset.count(),
      prisma.serviceTicket.count({ where: { stage: { notIn: ['CLOSED', 'CANCELLED'] } } }),
      prisma.asset.count({ where: { warrantyEnd: { gte: now, lte: in60 } } }),
      prisma.pmSchedule.count({
        where: {
          status: { in: ['PENDING', 'SCHEDULED'] },
          scheduledAt: { lte: in60 },
        },
      }),
    ]);

    return {
      ok: true,
      data: {
        sales: {
          customers,
          activeLeads,
          quotesThisMonth: quotesMonth,
          soThisMonth: salesOrdersMonth,
          revenueThisMonth: Number(soRevenueMonth._sum.total ?? 0),
        },
        operations: {
          installsPending,
          assetsTotal,
        },
        afterSales: {
          ticketsOpen,
          warrantyExpiring60d: warrantyExpiring,
          pmDueSoon60d: pmDueSoon,
        },
      },
    };
  });

  // ─── GET /reports/pipeline ─── lead counts by stage + value
  app.get('/pipeline', async () => {
    const groups = await prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
      _sum: { value: true },
    });
    const byStage = Object.fromEntries(
      groups.map((g) => [
        g.stage,
        { count: g._count._all, totalValue: Number(g._sum.value ?? 0) },
      ]),
    );
    return { ok: true, data: byStage };
  });

  // ─── GET /reports/sales-by-brand ─── sales orders grouped by product brand
  //     Good for exec dashboard: which brand is moving
  app.get('/sales-by-brand', async () => {
    const items = await prisma.sOItem.findMany({
      include: { product: { select: { brand: true } } },
    });
    const byBrand: Record<string, { qty: number; revenue: number }> = {};
    for (const it of items) {
      const brand = it.product.brand;
      const lineRev = Number(it.unitPrice) * it.qty;
      byBrand[brand] ??= { qty: 0, revenue: 0 };
      byBrand[brand]!.qty += it.qty;
      byBrand[brand]!.revenue += lineRev;
    }
    return { ok: true, data: byBrand };
  });

  // ─── GET /reports/tickets-by-stage ─── for after-sales ops dashboard
  app.get('/tickets-by-stage', async () => {
    const groups = await prisma.serviceTicket.groupBy({
      by: ['stage'],
      _count: { _all: true },
    });
    const byStage = Object.fromEntries(groups.map((g) => [g.stage, g._count._all]));
    return { ok: true, data: byStage };
  });

  // ─── GET /reports/tickets-by-priority ───
  app.get('/tickets-by-priority', async () => {
    const groups = await prisma.serviceTicket.groupBy({
      by: ['priority'],
      _count: { _all: true },
      where: { stage: { notIn: ['CLOSED', 'CANCELLED'] } },
    });
    const byPriority = Object.fromEntries(groups.map((g) => [g.priority, g._count._all]));
    return { ok: true, data: byPriority };
  });
  // ─── GET /reports/pm-compliance ─── PM compliance rate
  app.get('/pm-compliance', async () => {
    const now = new Date();
    const [total, completed, overdue, pending] = await Promise.all([
      prisma.pmSchedule.count(),
      prisma.pmSchedule.count({ where: { status: 'COMPLETED' } }),
      prisma.pmSchedule.count({ where: { status: 'OVERDUE' } }),
      prisma.pmSchedule.count({ where: { status: { in: ['PENDING', 'SCHEDULED'] } } }),
    ]);
    const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      ok: true,
      data: { total, completed, overdue, pending, complianceRate },
    };
  });

  // ─── GET /reports/sla-compliance ─── SLA compliance for tickets
  app.get('/sla-compliance', async () => {
    const closed = await prisma.serviceTicket.findMany({
      where: { stage: 'CLOSED', slaDueAt: { not: null }, closedAt: { not: null } },
      select: { slaDueAt: true, closedAt: true },
    });
    const onTime = closed.filter((t) => t.closedAt! <= t.slaDueAt!).length;
    const breached = closed.length - onTime;
    const rate = closed.length > 0 ? Math.round((onTime / closed.length) * 100) : 0;
    return { ok: true, data: { total: closed.length, onTime, breached, complianceRate: rate } };
  });

  // ─── GET /reports/csat ─── CSAT average from ticket ratings
  app.get('/csat', async () => {
    const rated = await prisma.serviceTicket.findMany({
      where: { customerRating: { not: null } },
      select: { customerRating: true },
    });
    const avg = rated.length > 0
      ? Number((rated.reduce((s, t) => s + (t.customerRating ?? 0), 0) / rated.length).toFixed(2))
      : null;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    for (const t of rated) {
      const r = t.customerRating;
      if (r !== null && r >= 1 && r <= 5) {
        distribution[r] = (distribution[r] ?? 0) + 1;
      }
    }
    return { ok: true, data: { totalRatings: rated.length, avgScore: avg, distribution } };
  });

  // ─── GET /reports/sales-kpis ─── conversion rates + deal velocity
  app.get('/sales-kpis', async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalLeads, totalQuotes, totalSO, wonLeads, lostLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.quotation.count(),
      prisma.salesOrder.count(),
      prisma.lead.count({ where: { stage: 'WON' } }),
      prisma.lead.count({ where: { stage: 'LOST' } }),
    ]);
    const winRate = (wonLeads + lostLeads) > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0;
    const leadToQuote = totalLeads > 0 ? Math.round((totalQuotes / totalLeads) * 100) : 0;
    const quoteToSo = totalQuotes > 0 ? Math.round((totalSO / totalQuotes) * 100) : 0;
    return {
      ok: true,
      data: { totalLeads, totalQuotes, totalSO, wonLeads, lostLeads, winRate, leadToQuote, quoteToSo },
    };
  });
};

export default reportsRoutes;
