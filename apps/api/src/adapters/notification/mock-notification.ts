import type {
  NotificationAdapter,
  NotificationTarget,
  NotificationMessage,
  NotificationResult,
} from '../types';

/**
 * Mock notification — logs to console + stores in Notification table
 * via the caller. Swap with LineOaAdapter / SesAdapter later.
 */
export class MockNotificationAdapter implements NotificationAdapter {
  readonly mode = 'mock' as const;

  async send(target: NotificationTarget, message: NotificationMessage): Promise<NotificationResult> {
    // Log only — real adapters (LINE, SMS) replace this class
    console.info('[MockNotification]', {
      channel: target.channel,
      to: target.recipient,
      title: message.title,
      body: message.body.slice(0, 80),
    });
    return {
      delivered: true,
      providerId: `mock-${Date.now().toString(36)}`,
    };
  }
}
