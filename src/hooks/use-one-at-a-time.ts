import { useRef } from 'react';

/**
 * Wraps an async action so it runs one at a time: calls made while it is still running are
 * ignored. For actions with more than one trigger, such as a button and the keyboard's Go key,
 * or a code that submits itself once complete, where the button's own double-tap guard
 * (useGuardedPress) can't see the other trigger.
 */
export function useOneAtATime<Args extends unknown[]>(action: (...args: Args) => Promise<void>) {
  const running = useRef(false);

  return async (...args: Args) => {
    if (running.current) return;
    running.current = true;
    try {
      await action(...args);
    } finally {
      running.current = false;
    }
  };
}
