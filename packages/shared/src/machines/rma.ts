/**
 * RMA (Returns/refurbish) state machine.
 *
 * Flow:
 *   REQUESTED → APPROVED → PICKUP_SCHEDULED → PICKED_UP → INSPECTING
 *              → REFUNDED | REPLACED | REFURBISHED   (terminal)
 *
 * Gates:
 *   * REQUESTED may also go to REJECTED (ops rejects) or CANCELLED (customer withdraws)
 *   * Any non-terminal stage → CANCELLED
 *
 * Resolution (REFUND / REPLACE / REFURBISH) is recorded separately as
 * Rma.resolution; the terminal stages are the UI-visible outcomes.
 */
import { createMachine } from 'xstate';

export const RMA_STAGES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'INSPECTING',
  'REFUNDED',
  'REPLACED',
  'REFURBISHED',
  'CANCELLED',
] as const;
export type RmaStage = (typeof RMA_STAGES)[number];

export const RMA_REASONS = [
  'DOA',
  'DEFECT',
  'WRONG_ITEM',
  'CUSTOMER_CHANGE_MIND',
  'WARRANTY_CLAIM',
  'OTHER',
] as const;
export type RmaReason = (typeof RMA_REASONS)[number];

const RMA_TRANSITIONS: Record<RmaStage, Record<string, RmaStage>> = {
  REQUESTED: {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    CANCEL: 'CANCELLED',
  },
  APPROVED: {
    SCHEDULE_PICKUP: 'PICKUP_SCHEDULED',
    CANCEL: 'CANCELLED',
  },
  PICKUP_SCHEDULED: {
    PICK_UP: 'PICKED_UP',
    CANCEL: 'CANCELLED',
  },
  PICKED_UP: {
    START_INSPECT: 'INSPECTING',
    CANCEL: 'CANCELLED',
  },
  INSPECTING: {
    REFUND: 'REFUNDED',
    REPLACE: 'REPLACED',
    REFURBISH: 'REFURBISHED',
    CANCEL: 'CANCELLED',
  },
  REJECTED: {},
  REFUNDED: {},
  REPLACED: {},
  REFURBISHED: {},
  CANCELLED: {},
};

export const rmaMachine = createMachine({
  id: 'rma',
  initial: 'REQUESTED',
  states: {
    REQUESTED: { on: RMA_TRANSITIONS.REQUESTED },
    APPROVED: { on: RMA_TRANSITIONS.APPROVED },
    PICKUP_SCHEDULED: { on: RMA_TRANSITIONS.PICKUP_SCHEDULED },
    PICKED_UP: { on: RMA_TRANSITIONS.PICKED_UP },
    INSPECTING: { on: RMA_TRANSITIONS.INSPECTING },
    REJECTED: { type: 'final' },
    REFUNDED: { type: 'final' },
    REPLACED: { type: 'final' },
    REFURBISHED: { type: 'final' },
    CANCELLED: { type: 'final' },
  },
});

export const RMA_EVENT_LABELS_TH: Record<string, string> = {
  APPROVE: 'อนุมัติ',
  REJECT: 'ปฏิเสธ',
  SCHEDULE_PICKUP: 'นัดรับสินค้า',
  PICK_UP: 'รับสินค้าแล้ว',
  START_INSPECT: 'เริ่มตรวจสอบ',
  REFUND: 'คืนเงิน',
  REPLACE: 'เปลี่ยนเครื่องใหม่',
  REFURBISH: 'ซ่อมและคืน',
  CANCEL: 'ยกเลิก',
};

export const RMA_STAGE_LABELS_TH: Record<RmaStage, string> = {
  REQUESTED: 'รอพิจารณา',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  PICKUP_SCHEDULED: 'นัดรับแล้ว',
  PICKED_UP: 'รับเครื่องแล้ว',
  INSPECTING: 'กำลังตรวจสอบ',
  REFUNDED: 'คืนเงินแล้ว',
  REPLACED: 'เปลี่ยนเครื่องแล้ว',
  REFURBISHED: 'ซ่อมและคืนแล้ว',
  CANCELLED: 'ยกเลิก',
};

export const RMA_REASON_LABELS_TH: Record<RmaReason, string> = {
  DOA: 'เสียตั้งแต่แกะกล่อง',
  DEFECT: 'ชำรุด/ผิดปกติ',
  WRONG_ITEM: 'ส่งผิดรุ่น',
  CUSTOMER_CHANGE_MIND: 'ลูกค้าเปลี่ยนใจ',
  WARRANTY_CLAIM: 'เคลมประกัน',
  OTHER: 'อื่นๆ',
};

export function rmaAllowedTransitions(from: RmaStage): Array<{ event: string; to: RmaStage }> {
  return Object.entries(RMA_TRANSITIONS[from]).map(([event, to]) => ({ event, to }));
}

export function canTransitionRma(from: RmaStage, to: RmaStage): boolean {
  if (from === to) return true;
  return Object.values(RMA_TRANSITIONS[from]).includes(to);
}
