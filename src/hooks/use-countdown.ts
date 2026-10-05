import { useEffect, useEffectEvent, useState } from 'react';

/** Milliseconds left until `endsAt`, ticking once a second. Calls `onDone` once at zero. */
export function useCountdown(endsAt: number | null | undefined, onDone?: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const done = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const left = endsAt ? Math.max(0, endsAt - now) : 0;

  useEffect(() => {
    if (endsAt && left === 0) done();
  }, [endsAt, left]);

  return left;
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutesLeft(ms: number) {
  const minutes = Math.ceil(ms / 60000);
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min left` : `${h} h left`;
  }
  return `${minutes} min left`;
}

/** "Starting now", "Starts in 25 min", "Started 10 min ago" for map events. */
export function formatEventTime(startsAt: number, now = Date.now()) {
  const diff = Math.round((startsAt - now) / 60000);
  if (Math.abs(diff) <= 1) return 'Starting now';
  if (diff > 0) return diff >= 60 ? `Starts in ${Math.floor(diff / 60)} h ${diff % 60 ? `${diff % 60} min` : ''}`.trim() : `Starts in ${diff} min`;
  const ago = -diff;
  return ago >= 60 ? `Started ${Math.floor(ago / 60)} h ago` : `Started ${ago} min ago`;
}
