/**
 * WebSocket plugin + /ws/tech endpoint.
 *
 * Auth: browsers can't set Authorization header on ws(s):// upgrade,
 * so we accept `?token=<jwt>` in the query string. The token is the
 * same staff JWT used for REST calls. We verify scope + role here.
 *
 * Once upgraded, the socket is subscribed to channel `tech:<userId>`.
 * Event-bus handlers in events/ws-handlers.ts push frames onto that
 * channel whenever a relevant domain event fires.
 */
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { wsRegistry } from '../lib/ws-registry';
import type { UserRole } from '@oms/shared';

const websocketPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyWebsocket);

  app.get('/ws/tech', { websocket: true }, (socket, req) => {
    const token = (req.query as { token?: string }).token;
    if (!token) {
      socket.close(1008, 'missing token');
      return;
    }

    let payload: { scope: string; sub: string; role?: UserRole };
    try {
      payload = app.jwt.verify(token) as typeof payload;
    } catch {
      socket.close(1008, 'invalid token');
      return;
    }

    if (payload.scope !== 'staff') {
      socket.close(1008, 'staff token required');
      return;
    }
    if (!['INSTALL', 'SERVICE', 'ADMIN'].includes(payload.role ?? '')) {
      socket.close(1008, 'not a tech user');
      return;
    }

    const channel = `tech:${payload.sub}` as const;
    wsRegistry.subscribe(channel, socket);

    // Greet + keepalive
    socket.send(JSON.stringify({ type: 'hello', channel, ts: new Date().toISOString() }));

    // Client can send ping; echo back pong. Also handles native WS pings.
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string };
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', ts: new Date().toISOString() }));
        }
      } catch {
        // Ignore garbage frames
      }
    });
  });

  // Lightweight stats endpoint (ADMIN only) for debugging
  app.get('/ws/stats', { preHandler: [app.authenticate, app.requireRole('ADMIN')] }, async () => {
    return { ok: true, data: wsRegistry.stats() };
  });
};

export default fp(websocketPlugin, { name: 'websocket', dependencies: ['auth'] });
