import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import * as api from '@/data/api';
import { NEARBY_REFRESH_MS } from '@/data/types';
import { showNearbyAlert, useStore } from '@/state/store';

/**
 * While you're live, watches for people nearby and prompts you:
 * a summary when you first go live, then one prompt per person who arrives later.
 * Each person is only announced once per live session.
 */
export function useNearbyAlerts() {
  const live = useStore((s) => s.availability !== null);
  const blockedIds = useStore((s) => s.blockedIds);
  const announced = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!live) {
      announced.current = null; // next live session starts fresh
      return;
    }
    let cancelled = false;

    const check = () =>
      api.nearby(blockedIds).then((people) => {
        if (cancelled) return;
        const first = announced.current === null;
        const seen = announced.current ?? new Set<string>();
        const fresh = people.filter((p) => !seen.has(p.id));
        fresh.forEach((p) => seen.add(p.id));
        announced.current = seen;
        if (fresh.length === 0) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (first && fresh.length > 1) {
          showNearbyAlert({ id: `summary-${Date.now()}`, kind: 'summary', count: fresh.length });
        } else {
          const person = fresh[fresh.length - 1]!;
          showNearbyAlert({ id: `person-${person.id}-${Date.now()}`, kind: 'person', person });
        }
      });

    check();
    const timer = setInterval(check, NEARBY_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, blockedIds]);
}
