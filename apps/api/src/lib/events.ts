/**
 * Typed in-memory event bus.
 *
 * Services emit domain events after mutations; handlers subscribe in
 * events/handlers.ts (registered once at boot). This decouples chains
 * like `install complete → create assets → schedule PM → notify customer`
 * so each side-effect lives in its own handler and can be tested in
 * isolation.
 *
 * Intentionally in-memory + synchronous for now. Upgrade to Postgres
 * LISTEN/NOTIFY or Redis pub/sub only when we need cross-process delivery
 * or retry semantics — YAGNI until then.
 *
 * IMPORTANT: handlers run AFTER the DB transaction that emitted the event
 * has committed. Emit from the route handler, not from inside $transaction.
 */
import { EventEmitter } from 'node:events';

// ─── Event payload types ──────────────────────────────────────
// Keep these small and JSON-safe. Handlers that need more data can
// fetch fresh from DB using the ids here.

export interface DomainEvents {
  'order.confirmed': {
    soId: string;
    soNo: string;
    customerId: string;
    total: number;
  };
  'order.cancelled': {
    soId: string;
    soNo: string;
    customerId: string;
    reason?: string;
  };
  'installation.scheduled': {
    installationId: string;
    soId: string;
    techId: string | null;
    scheduledAt: string;
  };
  'installation.completed': {
    installationId: string;
    soId: string;
    customerId: string;
    assetIds: string[];
  };
  'asset.created': {
    assetId: string;
    customerId: string;
    productId: string;
    serialNo: string;
    warrantyEnd: string;
  };
  'ticket.created': {
    ticketId: string;
    ticketNo: string;
    customerId: string;
    problemType: string;
    priority: string;
  };
  'ticket.assigned': {
    ticketId: string;
    ticketNo: string;
    techId: string;
    customerId: string;
  };
  'ticket.stage_changed': {
    ticketId: string;
    ticketNo: string;
    from: string;
    to: string;
  };
  'ticket.closed': {
    ticketId: string;
    ticketNo: string;
    customerId: string;
    techId: string | null;
  };
  'rma.created': {
    rmaId: string;
    rmaNo: string;
    customerId: string;
    reason: string;
  };
  'rma.stage_changed': {
    rmaId: string;
    rmaNo: string;
    customerId: string;
    from: string;
    to: string;
  };
  'payment.milestone_paid': {
    milestoneId: string;
    soId: string;
    amount: number;
  };
}

export type DomainEventName = keyof DomainEvents;
export type DomainEventPayload<K extends DomainEventName> = DomainEvents[K];

// ─── Typed wrapper around EventEmitter ────────────────────────
class TypedEventBus {
  private readonly emitter = new EventEmitter({ captureRejections: true });

  constructor() {
    // Swallow handler errors so one bad subscriber doesn't break others.
    // We still log — routes don't need to know about side-effect failures.
    this.emitter.on('error', (err) => {
      console.error('[event-bus] handler error:', err);
    });
  }

  emit<K extends DomainEventName>(event: K, payload: DomainEventPayload<K>): void {
    this.emitter.emit(event, payload);
  }

  on<K extends DomainEventName>(
    event: K,
    handler: (payload: DomainEventPayload<K>) => void | Promise<void>,
  ): void {
    this.emitter.on(event, (payload) => {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          result.catch((err) => console.error(`[event-bus] ${event} handler rejected:`, err));
        }
      } catch (err) {
        console.error(`[event-bus] ${event} handler threw:`, err);
      }
    });
  }

  /** For tests: remove all listeners */
  removeAll(): void {
    this.emitter.removeAllListeners();
  }
}

export const bus = new TypedEventBus();
