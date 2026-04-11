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
};

export default reportsRoutes;
