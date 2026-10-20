// Pure helpers that turn milliseconds and timestamps into human wording.
// No React in here, so they're trivial to test and reuse.

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export function formatClock(ms: number) {
  // Floor, like a wall clock: a 5-minute window reads 5:00, never 5:01.
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMinutesLeft(ms: number) {
  // Rounded up, minus a one-second tolerance for the shared clock's tick, so a fresh
  // 30-minute session reads "30 min left", never "31".
  let minutes = 0;
  if (ms > 0) {
    minutes = Math.max(1, Math.ceil((ms - 1000) / MINUTE_MS));
  }

  if (minutes < 60) {
    return `${minutes} min left`;
  }
  const hours = Math.floor(minutes / 60);
  const extraMinutes = minutes % 60;
  if (extraMinutes === 0) {
    return `${hours} h left`;
  }
  return `${hours} h ${extraMinutes} min left`;
}

/** "Starting now", "Starts in 25 min", "Started 10 min ago" for map events. */
export function formatEventTime(startsAt: number, now = Date.now()) {
  const minutesUntilStart = Math.round((startsAt - now) / MINUTE_MS);
  if (Math.abs(minutesUntilStart) <= 1) {
    return 'Starting now';
  }

  if (minutesUntilStart > 0) {
    if (minutesUntilStart < 60) {
      return `Starts in ${minutesUntilStart} min`;
    }
    const hours = Math.floor(minutesUntilStart / 60);
    const extraMinutes = minutesUntilStart % 60;
    if (extraMinutes === 0) {
      return `Starts in ${hours} h`;
    }
    return `Starts in ${hours} h ${extraMinutes} min`;
  }

  const minutesAgo = -minutesUntilStart;
  if (minutesAgo < 60) {
    return `Started ${minutesAgo} min ago`;
  }
  return `Started ${Math.floor(minutesAgo / 60)} h ago`;
}

/** A chosen start time, the way a person would say it. */
export function formatStartTime(ts: number, now = Date.now()) {
  if (ts - now < 2 * MINUTE_MS) return 'Now';

  const date = new Date(ts);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date(now).toDateString();
  const tomorrow = new Date(now + DAY_MS).toDateString();

  if (date.toDateString() === today) return `Today ${time}`;
  if (date.toDateString() === tomorrow) return `Tomorrow ${time}`;

  const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${time}`;
}
