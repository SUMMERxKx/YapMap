import { useCallback, useEffect, useState } from 'react';

import { NEARBY_REFRESH_MS } from '@/data/constants';
import { refreshNearby, useStore } from '@/state/store';

/**
 * Keeps the shared nearby list fresh: one refresh every 20 seconds while you're live and
 * the app is on screen. Used once, in the app layout; everything else reads the list.
 */
export function useNearbyPolling() {
  const live = useStore((state) => state.availability !== null);
  const appActive = useStore((state) => state.appActive);

  useEffect(() => {
    if (!live || !appActive) return;
    void refreshNearby();
    const timer = setInterval(() => void refreshNearby(), NEARBY_REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, appActive]);
}

/** Nearby available people from the shared list, with pull-to-refresh. */
export function useNearby() {
  const people = useStore((state) => state.nearby);
  const error = useStore((state) => state.nearbyFailed);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNearby();
    setRefreshing(false);
  }, []);

  return { people, refreshing, refresh, error };
}
