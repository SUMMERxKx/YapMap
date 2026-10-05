// Count down to a deadline, re-rendering once a second via the shared clock.

import { useEffect, useEffectEvent } from 'react';

import { useClock } from './clock';

/** Milliseconds left until `endsAt`, ticking once a second. Calls `onDone` once at zero. */
export function useCountdown(endsAt: number | null | undefined, onDone?: () => void) {
  const now = useClock(!!endsAt);
  const done = useEffectEvent(() => onDone?.());
  const left = endsAt ? Math.max(0, endsAt - now) : 0;

  useEffect(() => {
    if (endsAt && left === 0) done();
  }, [endsAt, left]);

  return left;
}
