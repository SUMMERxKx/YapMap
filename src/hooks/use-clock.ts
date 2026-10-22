import { useSyncExternalStore } from 'react';

import { serverNow } from '@/lib/server-clock';

// A shared once-a-second clock, exposed as an external store so components can render
// countdowns without calling Date.now() during render (which React forbids as impure).
// One interval serves every subscriber and stops when nobody is listening. It tells the
// server's time (see server-clock), since every deadline counted down to comes from the server.

const listeners = new Set<() => void>();
let now = serverNow();
let timer: ReturnType<typeof setInterval> | null = null;

function readNow() {
  // Refresh the cached time when it's a tick stale (e.g. the first read after the timer
  // was idle), but keep it stable within a second so React sees a consistent snapshot.
  const current = serverNow();
  const isStale = current - now >= 1000;
  const wentBackwards = current < now; // the device clock was changed
  if (isStale || wentBackwards) {
    now = current;
  }
  return now;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = serverNow();
    timer = setInterval(() => {
      now = serverNow();
      listeners.forEach((listener) => listener());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Used while the clock is inactive: never calls the listener, so nothing re-renders.
function subscribeNothing() {
  return () => {};
}

/** The current time, updating once a second while `active`. Frozen when inactive. */
export function useClock(active: boolean) {
  let subscribeToClock: typeof subscribe = subscribeNothing;
  if (active) {
    subscribeToClock = subscribe;
  }
  return useSyncExternalStore(subscribeToClock, readNow, readNow);
}
