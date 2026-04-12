import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Tech PWA WebSocket subscriber.
 *
 * Connects to /ws/tech?token=<jwt> and invalidates the 'my-tickets'
 * query whenever a relevant server push arrives. Reconnects with
 * exponential backoff on close.
 *
 * Derives ws URL from VITE_API_BASE_URL: strip /api/v1 and flip
 * https:// → wss:// so the browser can hit Nginx → Fastify through
 * the same Cloudflare tunnel that serves REST.
 */
export function useTechSocket(enabled: boolean) {
  const qc = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const token = localStorage.getItem('techAccessToken');
      if (!token) return;

      const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
      // "https://x/api/v1" → "wss://x/ws/tech"
      const wsBase = base.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws')).replace(/\/api\/v1$/, '');
      const url = `${wsBase}/ws/tech?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = 1000; // reset on success
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string };
          if (msg.type === 'ticket.assigned' || msg.type === 'ticket.stage_changed') {
            qc.invalidateQueries({ queryKey: ['my-tickets'] });
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (cancelled) return;
        const delay = Math.min(backoffRef.current, 15_000);
        backoffRef.current = Math.min(delay * 2, 15_000);
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // Let onclose handle retry
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, qc]);
}
