import { useSyncExternalStore } from 'react';

// A shared once-a-second clock, exposed as an external store so components can render
// countdowns without calling Date.now() during render (which React forbids as impure).
// One interval serves every subscriber and stops when nobody is listening.

const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function readNow() {
  // Refresh the cached time when it's a tick stale (e.g. the first read after the timer
  // was idle), but keep it stable within a second so React sees a consistent snapshot.
  const current = Date.now();
  if (current - now >= 1000 || current < now) now = current;
  return now;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
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

const subscribeNothing = () => () => {};

/** The current time, updating once a second while `active`. Frozen when inactive. */
export function useClock(active: boolean) {
  return useSyncExternalStore(active ? subscribe : subscribeNothing, readNow, readNow);
}
