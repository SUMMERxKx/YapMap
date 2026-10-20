// Count down to a deadline, re-rendering once a second via the shared clock.

import { useEffect, useEffectEvent } from 'react';

import { useClock } from './use-clock';

/** Milliseconds left until `endsAt`, ticking once a second. Calls `onDone` once at zero. */
export function useCountdown(endsAt: number | null | undefined, onDone?: () => void) {
  const hasDeadline = Boolean(endsAt);
  const now = useClock(hasDeadline);
  const done = useEffectEvent(() => onDone?.());

  let left = 0;
  if (endsAt) {
    left = Math.max(0, endsAt - now);
  }

  useEffect(() => {
    if (endsAt && left === 0) done();
  }, [endsAt, left]);

  return left;
}
