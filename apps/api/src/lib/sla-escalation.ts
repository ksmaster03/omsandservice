/**
 * SLA Auto-Escalation — runs every 15 minutes via setInterval.
 *
 * 3 levels:
 *   Warning  (80% SLA elapsed) — log + mark priority
 *   Breach   (100% SLA elapsed) — notify via adapter
 *   Critical (120% SLA elapsed) — notify + flag
 */
import { prisma } from './prisma';
import { adapters } from '../adapters/registry';
import { bus } from './events';

export async function checkSlaEscalation(): Promise<{ warned: number; breached: number; critical: number }> {
  const now = new Date();
  let warned = 0;
  let breached = 0;
  let critical = 0;

  const openTickets = await prisma.serviceTicket.findMany({
    where: {
      stage: { notIn: ['CLOSED', 'CANCELLED'] },
      slaDueAt: { not: null },
    },
    select: {
      id: true,
      ticketNo: true,
      priority: true,
      stage: true,
      slaDueAt: true,
      createdAt: true,
      customerId: true,
      assignedTechId: true,
      customer: { select: { name: true, phone: true, email: true } },
    },
  });

  for (const ticket of openTickets) {
    if (!ticket.slaDueAt) continue;

    const totalSla = ticket.slaDueAt.getTime() - ticket.createdAt.getTime();
    const elapsed = now.getTime() - ticket.createdAt.getTime();
    const pct = totalSla > 0 ? (elapsed / totalSla) * 100 : 0;

    if (pct >= 120) {
      critical++;
      if (ticket.assignedTechId) {
        const tech = await prisma.user.findUnique({ where: { id: ticket.assignedTechId }, select: { phone: true, email: true } });
        if (tech?.phone || tech?.email) {
          await adapters.notification.send(
            { channel: tech.phone ? 'sms' : 'email', recipient: tech.phone ?? tech.email! },
            { title: '🚨 SLA CRITICAL', body: `${ticket.ticketNo} เกิน SLA 120% — กรุณาดำเนินการด่วน` },
          );
        }
      }
    } else if (pct >= 100) {
      breached++;
      if (ticket.customer.phone || ticket.customer.email) {
        await adapters.notification.send(
          { channel: ticket.customer.phone ? 'sms' : 'email', recipient: ticket.customer.phone ?? ticket.customer.email! },
          { title: 'SLA Breach', body: `${ticket.ticketNo} เกิน SLA — ทีมงานกำลังเร่งดำเนินการ` },
        );
      }
    } else if (pct >= 80) {
      warned++;
    }
  }

  return { warned, breached, critical };
}
