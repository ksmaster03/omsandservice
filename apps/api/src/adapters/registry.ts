/**
 * Single source of truth for which adapter implementation is active.
 * Routes/services import `adapters` from here, never the concrete classes.
 *
 * Wiring happens once at server boot; swap to live adapter by setting
 * the right env vars (WMS_BASE_URL, LINE_CHANNEL_ACCESS_TOKEN, etc).
 */
import { env } from '../config/env';
import type { WmsAdapter, NotificationAdapter, PaymentAdapter } from './types';
import { MockWmsAdapter } from './wms/mock-wms';
import { LiveWmsAdapter } from './wms/live-wms';
import { MockNotificationAdapter } from './notification/mock-notification';
import { LineOaNotificationAdapter } from './notification/line-oa';
import { MockPaymentAdapter } from './payment/mock-payment';

const wms: WmsAdapter =
  env.WMS_BASE_URL && env.WMS_API_KEY ? new LiveWmsAdapter() : new MockWmsAdapter();

const notification: NotificationAdapter =
  env.LINE_CHANNEL_ACCESS_TOKEN ? new LineOaNotificationAdapter() : new MockNotificationAdapter();

const payment: PaymentAdapter = new MockPaymentAdapter();

export const adapters = {
  wms,
  notification,
  payment,
} as const;

export type Adapters = typeof adapters;
