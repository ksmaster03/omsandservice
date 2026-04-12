/**
 * WebSocket channel registry.
 *
 * Maps logical channel keys → connected sockets. Today we have one
 * channel type: `tech:<userId>` (staff tech receiving ticket push).
 * More channel types (e.g. `customer:<id>`) can reuse the same registry.
 *
 * Single-process in-memory. When we scale horizontally, either
 * (a) pin tech users to one process via sticky session, or
 * (b) add a Postgres LISTEN/NOTIFY or Redis pub/sub layer.
 */
import type { WebSocket } from 'ws';

type Channel = `tech:${string}` | `customer:${string}`;

class WsRegistry {
  private readonly channels = new Map<Channel, Set<WebSocket>>();

  subscribe(channel: Channel, socket: WebSocket): void {
    let bucket = this.channels.get(channel);
    if (!bucket) {
      bucket = new Set();
      this.channels.set(channel, bucket);
    }
    bucket.add(socket);
    socket.once('close', () => this.unsubscribe(channel, socket));
  }

  unsubscribe(channel: Channel, socket: WebSocket): void {
    const bucket = this.channels.get(channel);
    if (!bucket) return;
    bucket.delete(socket);
    if (bucket.size === 0) this.channels.delete(channel);
  }

  push(channel: Channel, message: unknown): number {
    const bucket = this.channels.get(channel);
    if (!bucket || bucket.size === 0) return 0;
    const payload = JSON.stringify(message);
    let delivered = 0;
    for (const socket of bucket) {
      if (socket.readyState === 1 /* OPEN */) {
        try {
          socket.send(payload);
          delivered++;
        } catch {
          // Drop bad socket silently; close handler cleans up
        }
      }
    }
    return delivered;
  }

  /** For debug/health endpoints */
  stats(): { channels: number; totalSockets: number } {
    let totalSockets = 0;
    for (const bucket of this.channels.values()) totalSockets += bucket.size;
    return { channels: this.channels.size, totalSockets };
  }
}

export const wsRegistry = new WsRegistry();
export type { Channel };
