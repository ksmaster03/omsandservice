import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateTicketStage } from '../lib/queries';
import * as queue from '../lib/offlineQueue';

/**
 * Subscribe to queue size + drain pending mutations when back online.
 * Returns [pendingCount, isOnline].
 */
export function useOfflineQueue(): [number, boolean] {
  const qc = useQueryClient();
  const [pending, setPending] = useState(() => queue.peek().length);
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    return queue.onChange(setPending);
  }, []);

  useEffect(() => {
    const setOn = () => setOnline(true);
    const setOff = () => setOnline(false);
    window.addEventListener('online', setOn);
    window.addEventListener('offline', setOff);
    return () => {
      window.removeEventListener('online', setOn);
      window.removeEventListener('offline', setOff);
    };
  }, []);

  // Drain when we come back online
  useEffect(() => {
    if (!online) return;
    const items = queue.peek();
    if (items.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of items) {
        if (cancelled) return;
        try {
          await updateTicketStage(item.ticketId, item.toStage);
          queue.remove(item.id);
          qc.invalidateQueries({ queryKey: ['my-tickets'] });
          toast.success(`ซิงค์สถานะของคิวที่ค้าง (${item.toStage})`);
        } catch (err) {
          queue.bumpAttempt(item.id);
          // Give up after 5 tries
          if (item.attempts >= 4) {
            queue.remove(item.id);
            toast.error(`ซิงค์ไม่สำเร็จหลายครั้ง — ลบ ${item.toStage} ออกจากคิว`);
          } else {
            // Network may have flickered back off
            toast.warning('ซิงค์ล้มเหลว จะลองใหม่');
            break;
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [online, qc]);

  return [pending, online];
}
