// Pure helpers that turn milliseconds and timestamps into human wording.
// No React in here, so they're trivial to test and reuse.

export function formatClock(ms: number) {
  // Floor, like a wall clock: a 5-minute window reads 5:00, never 5:01.
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutesLeft(ms: number) {
  // Rounded up, minus a one-second tolerance for the shared clock's tick, so a fresh
  // 30-minute session reads "30 min left", never "31".
  const minutes = ms <= 0 ? 0 : Math.max(1, Math.ceil((ms - 1000) / 60000));
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

/** A chosen start time, the way a person would say it. */
export function formatStartTime(ts: number, now = Date.now()) {
  if (ts - now < 2 * 60 * 1000) return 'Now';
  const date = new Date(ts);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date(now).toDateString()) return `Today ${time}`;
  if (date.toDateString() === new Date(now + 86400000).toDateString()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}
