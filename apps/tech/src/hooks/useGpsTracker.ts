import { useEffect, useRef, useState } from 'react';
import { pingLocation } from '../lib/queries';

/**
 * GPS tracker hook — starts pinging the API every `intervalSeconds` while
 * enabled. Uses navigator.geolocation.watchPosition to get a stream of
 * updates and throttles the POST to the interval.
 *
 * Settings interval is pulled from the admin-configurable Setting table
 * via /api/v1/tech/settings. Falls back to 30s on fetch failure.
 */
export function useGpsTracker(enabled: boolean, activeTicketId?: string, intervalSeconds = 30) {
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSentAt = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAt.current < intervalSeconds * 1000) return;
        lastSentAt.current = now;
        try {
          await pingLocation(pos.coords.latitude, pos.coords.longitude, activeTicketId);
          setLastPing(new Date());
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'ส่งพิกัดไม่สำเร็จ');
        }
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, activeTicketId, intervalSeconds]);

  return { lastPing, error };
}

/** Open Google Maps app/site with directions to given lat/lng. */
export function openGoogleMapsNavigation(lat: number, lng: number) {
  // Universal link — opens Google Maps app on mobile, google.com/maps on desktop
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
