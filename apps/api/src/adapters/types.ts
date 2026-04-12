/**
 * Adapter interfaces — all external integrations implement one of these.
 * Routes/services call `adapters.wms.pushOrder(...)` via registry,
 * never import concrete classes directly.
 */
import type { WmsOrderPush, WmsStock } from '@oms/shared';

// ─── WMS ──────────────────────────────────────────────────────
export interface WmsAdapter {
  readonly mode: 'mock' | 'live';
  getStock(sku: string): Promise<WmsStock[]>;
  pushOrder(payload: WmsOrderPush): Promise<{ wmsOrderId: string }>;
}

// ─── Notification (LINE OA, SMS, email) ───────────────────────
export type NotificationChannel = 'line' | 'sms' | 'email' | 'push';

export interface NotificationTarget {
  channel: NotificationChannel;
  /** LINE userId, phone number, email, or device token */
  recipient: string;
}

export interface NotificationMessage {
  title?: string;
  body: string;
  /** Optional deeplink or URL */
  link?: string;
  /** Freeform metadata to log */
  meta?: Record<string, unknown>;
}

export interface NotificationResult {
  delivered: boolean;
  providerId?: string;
  error?: string;
}

export interface NotificationAdapter {
  readonly mode: 'mock' | 'live';
  send(target: NotificationTarget, message: NotificationMessage): Promise<NotificationResult>;
}

// ─── Payment ──────────────────────────────────────────────────
export interface PaymentChargeInput {
  milestoneId: string;
  amount: number;
  currency: 'THB';
  method: 'bank_transfer' | 'promptpay' | 'card' | 'cash';
  reference?: string;
}

export interface PaymentChargeResult {
  status: 'pending' | 'paid' | 'failed';
  providerTxnId?: string;
  paidAt?: Date;
  error?: string;
}

export interface PaymentAdapter {
  readonly mode: 'mock' | 'live';
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  verify(providerTxnId: string): Promise<PaymentChargeResult>;
}
