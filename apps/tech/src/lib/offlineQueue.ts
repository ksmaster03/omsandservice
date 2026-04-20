/**
 * Offline-tolerant mutation queue for tech PWA.
 *
 * When the tech is offline (or the server is unreachable), pending stage
 * updates are serialized to localStorage. On reconnect, we drain the queue
 * in order. UI can subscribe via the custom event to show pending count.
 *
 * This is a lightweight alternative to Workbox Background Sync — enough for
 * our current scale, and works without a custom service worker.
 */
const KEY = 'tech:offline-queue-v1';
const EVT = 'tech-offline-queue';

export interface QueuedMutation {
  id: string;           // UUID
  ticketId: string;
  toStage: string;
  createdAt: number;    // epoch ms
  attempts: number;
}

function read(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

function write(items: QueuedMutation[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT, { detail: items.length }));
}

export function enqueue(item: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>): QueuedMutation {
  const full: QueuedMutation = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
  };
  write([...read(), full]);
  return full;
}

export function peek(): QueuedMutation[] {
  return read();
}

export function remove(id: string): void {
  write(read().filter((i) => i.id !== id));
}

export function bumpAttempt(id: string): void {
  write(read().map((i) => (i.id === id ? { ...i, attempts: i.attempts + 1 } : i)));
}

export function clear(): void {
  write([]);
}

export function onChange(cb: (count: number) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<number>).detail);
  window.addEventListener(EVT, h);
  // Seed initial count
  cb(read().length);
  return () => window.removeEventListener(EVT, h);
}

export const OFFLINE_EVT = EVT;
