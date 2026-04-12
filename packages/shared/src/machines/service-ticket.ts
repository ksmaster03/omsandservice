/**
 * Service ticket state machine (XState v5).
 *
 * Authoritative source of "which transitions are allowed" for both
 * the API (validate stage updates) and the admin web UI (show only
 * valid action buttons). One definition, two consumers — no drift.
 *
 * Happy path:
 *   RECEIVED → ASSIGNED → EN_ROUTE → ARRIVED → REPAIRING → CLOSED
 * Branches:
 *   * from any non-terminal stage → CANCELLED
 *   * REPAIRING may loop back to ARRIVED (need parts, revisit)
 *   * ASSIGNED may loop back to RECEIVED (reassign/unassign)
 */
import { createMachine } from 'xstate';
import type { TicketStage } from '../constants';

export type { TicketStage };

/**
 * Transition table — single source of truth. The XState machine below
 * is built from this so the typed event table and the runtime machine
 * cannot drift. UI + server both inspect this map for allowed next
 * steps given a current stage.
 */
const TRANSITIONS: Record<TicketStage, Record<string, TicketStage>> = {
  RECEIVED: {
    ASSIGN: 'ASSIGNED',
    CANCEL: 'CANCELLED',
  },
  ASSIGNED: {
    START_ROUTE: 'EN_ROUTE',
    UNASSIGN: 'RECEIVED',
    CANCEL: 'CANCELLED',
  },
  EN_ROUTE: {
    ARRIVE: 'ARRIVED',
    CANCEL: 'CANCELLED',
  },
  ARRIVED: {
    START_REPAIR: 'REPAIRING',
    CANCEL: 'CANCELLED',
  },
  REPAIRING: {
    CLOSE: 'CLOSED',
    NEED_REVISIT: 'ARRIVED',
    CANCEL: 'CANCELLED',
  },
  CLOSED: {},
  CANCELLED: {},
};

export const serviceTicketMachine = createMachine({
  id: 'serviceTicket',
  initial: 'RECEIVED',
  states: {
    RECEIVED: { on: TRANSITIONS.RECEIVED },
    ASSIGNED: { on: TRANSITIONS.ASSIGNED },
    EN_ROUTE: { on: TRANSITIONS.EN_ROUTE },
    ARRIVED: { on: TRANSITIONS.ARRIVED },
    REPAIRING: { on: TRANSITIONS.REPAIRING },
    CLOSED: { type: 'final' },
    CANCELLED: { type: 'final' },
  },
});

/**
 * Event → target stage mapping used by UI buttons + API validator.
 * Source of truth for "what button pushes which transition".
 */
export const TICKET_EVENT_TO_STAGE: Record<string, TicketStage> = {
  ASSIGN: 'ASSIGNED',
  UNASSIGN: 'RECEIVED',
  START_ROUTE: 'EN_ROUTE',
  ARRIVE: 'ARRIVED',
  START_REPAIR: 'REPAIRING',
  CLOSE: 'CLOSED',
  NEED_REVISIT: 'ARRIVED',
  CANCEL: 'CANCELLED',
};

export const TICKET_EVENT_LABELS_TH: Record<string, string> = {
  ASSIGN: 'มอบหมายช่าง',
  UNASSIGN: 'ยกเลิกมอบหมาย',
  START_ROUTE: 'เริ่มเดินทาง',
  ARRIVE: 'ถึงหน้างาน',
  START_REPAIR: 'เริ่มซ่อม',
  CLOSE: 'ปิดงาน',
  NEED_REVISIT: 'ต้องกลับมาใหม่',
  CANCEL: 'ยกเลิก',
};

/**
 * Compute the next valid stages from a given current stage.
 * Pure function so both server (validation) and client (UI) can use it
 * without spinning up an actor.
 */
export function allowedTransitions(from: TicketStage): Array<{ event: string; to: TicketStage }> {
  const table = TRANSITIONS[from];
  return Object.entries(table).map(([event, to]) => ({ event, to }));
}

/** Check if a direct stage → stage transition is legal. */
export function canTransition(from: TicketStage, to: TicketStage): boolean {
  if (from === to) return true;
  return Object.values(TRANSITIONS[from]).includes(to);
}
