import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { showNearbyAlert, useStore } from '@/state/store';

/**
 * While you're live, watches the shared nearby list and prompts you:
 * a summary when you first go live, then one prompt per person who arrives later.
 * Each person is only announced once per live session.
 */
export function useNearbyAlerts() {
  const live = useStore((state) => state.availability !== null);
  const people = useStore((state) => state.nearby);
  // Ids already announced this live session; null until the first list of a session.
  const announced = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!live) {
      announced.current = null; // next live session starts fresh
      return;
    }
    if (people === null) return; // not loaded yet

    const isFirstList = announced.current === null;
    const seen = announced.current ?? new Set<string>();
    const newPeople = people.filter((person) => !seen.has(person.id));
    newPeople.forEach((person) => seen.add(person.id));
    announced.current = seen;
    if (newPeople.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (isFirstList && newPeople.length > 1) {
      showNearbyAlert({ id: `summary-${Date.now()}`, kind: 'summary', count: newPeople.length });
      return;
    }
    const newest = newPeople[newPeople.length - 1]!;
    showNearbyAlert({ id: `person-${newest.id}-${Date.now()}`, kind: 'person', person: newest });
  }, [live, people]);
}
