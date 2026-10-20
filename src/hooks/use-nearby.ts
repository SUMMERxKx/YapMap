import { useCallback, useEffect, useState } from 'react';

import * as api from '@/data/api';
import { NEARBY_REFRESH_MS } from '@/data/constants';
import type { NearbyPerson } from '@/data/types';
import { useStore } from '@/state/store';

/** Nearby available people, refreshed every 20 seconds while `enabled`. */
export function useNearby(enabled: boolean) {
  const blockedIds = useStore((state) => state.blockedIds);
  const [people, setPeople] = useState<NearbyPerson[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await api.nearby(blockedIds);
        if (cancelled) return;
        setPeople(result);
        setError(false);
      } catch {
        if (cancelled) return;
        setError(true);
      }
    };
    load();
    const timer = setInterval(load, NEARBY_REFRESH_MS);
    return () => {
      cancelled = true; // ignore answers that arrive after the screen closes
      clearInterval(timer);
    };
  }, [enabled, blockedIds]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPeople(await api.nearby(blockedIds));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [blockedIds]);

  // While disabled, report no list at all rather than a stale one.
  let visiblePeople: NearbyPerson[] | null = null;
  if (enabled) {
    visiblePeople = people;
  }
  return { people: visiblePeople, refreshing, refresh, error };
}
