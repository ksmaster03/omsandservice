/**
 * LINE OA Messaging API adapter — sends push messages via official LINE API.
 *
 * Requires env:
 *   LINE_CHANNEL_ACCESS_TOKEN — long-lived token from LINE Developer Console
 *
 * Target recipient must be the LINE userId (not display name). The customer
 * PWA stores this in CustomerUser.lineUserId after LINE Login.
 *
 * Falls back gracefully if the target has no LINE userId or the token is
 * missing — just returns { delivered: false } so the system doesn't crash.
 *
 * Docs: https://developers.line.biz/en/reference/messaging-api/#send-push-message
 */
import type {
  NotificationAdapter,
  NotificationTarget,
  NotificationMessage,
  NotificationResult,
} from '../types';
import { env } from '../../config/env';

export class LineOaNotificationAdapter implements NotificationAdapter {
  readonly mode = 'live' as const;

  async send(target: NotificationTarget, message: NotificationMessage): Promise<NotificationResult> {
    if (target.channel !== 'line') {
      return { delivered: false, error: 'LineOaAdapter only handles channel=line' };
    }
    if (!env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.warn('[LineOA] LINE_CHANNEL_ACCESS_TOKEN not set — skipping push');
      return { delivered: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
    }
    if (!target.recipient) {
      return { delivered: false, error: 'No LINE userId' };
    }

    const body = {
      to: target.recipient,
      messages: [
        {
          type: 'text' as const,
          text: message.title
            ? `📌 ${message.title}\n\n${message.body}`
            : message.body,
        },
      ],
    };

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[LineOA] push failed', res.status, text);
        return { delivered: false, error: `LINE API ${res.status}: ${text.slice(0, 200)}` };
      }

      const data = (await res.json()) as Record<string, unknown>;
      return {
        delivered: true,
        providerId: (data.sentMessages as Array<{ id: string }>)?.[0]?.id,
      };
    } catch (err) {
      console.error('[LineOA] push error', err);
      return { delivered: false, error: String(err) };
    }
  }
}
