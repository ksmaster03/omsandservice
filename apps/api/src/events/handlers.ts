/**
 * Domain event handlers — registered once at server boot.
 * Each handler does ONE thing and is independently testable.
 *
 * Keep handlers thin; if logic grows complex, extract to a service
 * function and have the handler call it.
 */
import { bus } from '../lib/events';
import { prisma } from '../lib/prisma';
import { adapters } from '../adapters/registry';
import { wsRegistry } from '../lib/ws-registry';

export function registerEventHandlers(): void {
  // ─── Installation completed → notify customer + log ───
  bus.on('installation.completed', async ({ installationId, customerId, assetIds }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!customer) return;

    if (customer.phone || customer.email) {
      await adapters.notification.send(
        {
          channel: customer.phone ? 'sms' : 'email',
          recipient: customer.phone ?? customer.email!,
        },
        {
          title: 'ติดตั้งเสร็จสิ้น',
          body: `เครื่องของคุณ ${customer.name} ติดตั้งเสร็จเรียบร้อย (${assetIds.length} เครื่อง) ขอบคุณที่ใช้บริการ Toptier`,
          meta: { installationId },
        },
      );
    }
  });

  // ─── Ticket assigned → push via WS + notify tech ───
  bus.on('ticket.assigned', async ({ ticketId, ticketNo, techId }) => {
    // Real-time push to tech PWA (if connected)
    wsRegistry.push(`tech:${techId}`, {
      type: 'ticket.assigned',
      payload: { ticketId, ticketNo },
      ts: new Date().toISOString(),
    });

    const tech = await prisma.user.findUnique({
      where: { id: techId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!tech) return;
    if (tech.phone || tech.email) {
      await adapters.notification.send(
        {
          channel: tech.phone ? 'sms' : 'email',
          recipient: tech.phone ?? tech.email!,
        },
        {
          title: 'งานใหม่',
          body: `คุณได้รับมอบหมาย Service Ticket ${ticketNo} — เปิดแอปเพื่อดูรายละเอียด`,
          meta: { ticketId },
        },
      );
    }
  });

  // ─── Ticket stage changed → push to assigned tech if any ───
  bus.on('ticket.stage_changed', async ({ ticketId, ticketNo, to }) => {
    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: ticketId },
      select: { assignedTechId: true },
    });
    if (ticket?.assignedTechId) {
      wsRegistry.push(`tech:${ticket.assignedTechId}`, {
        type: 'ticket.stage_changed',
        payload: { ticketId, ticketNo, stage: to },
        ts: new Date().toISOString(),
      });
    }
  });

  // ─── Ticket closed → request CSAT rating from customer ───
  bus.on('ticket.closed', async ({ ticketNo, ticketId, customerId }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!customer) return;
    if (customer.phone || customer.email) {
      await adapters.notification.send(
        {
          channel: customer.phone ? 'sms' : 'email',
          recipient: customer.phone ?? customer.email!,
        },
        {
          title: 'ขอให้คะแนนบริการ',
          body: `งาน ${ticketNo} เสร็จเรียบร้อย กรุณาให้คะแนนบริการ 1-5 ดาว ผ่านแอป Toptier`,
          link: `/tickets/${ticketId}`,
        },
      );
    }
  });

  // ─── RMA stage changed → notify customer ───
  bus.on('rma.stage_changed', async ({ rmaNo, customerId, to }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, phone: true, email: true },
    });
    if (!customer) return;
    const terminal = ['REFUNDED', 'REPLACED', 'REFURBISHED', 'REJECTED', 'CANCELLED'];
    if (terminal.includes(to) && (customer.phone || customer.email)) {
      await adapters.notification.send(
        { channel: customer.phone ? 'sms' : 'email', recipient: customer.phone ?? customer.email! },
        { title: 'อัปเดต RMA', body: `RMA ${rmaNo} เปลี่ยนสถานะเป็น ${to}` },
      );
    }
  });

  // ─── Asset created → nothing for now, hook point for future ───
  // PM schedule is still created inside the install transaction to
  // guarantee atomicity. Later we can move it here if we need
  // eventual consistency.
}
