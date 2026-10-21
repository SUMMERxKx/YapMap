// Turns the value stored on an event into the name and icon the app shows for it.

import { EVENT_CATEGORIES, EVENT_CATEGORY_FALLBACK } from '@/data/constants';

/** The category for an event's stored value; unknown values get a neutral calendar icon. */
export function eventCategory(value: string) {
  const match = EVENT_CATEGORIES.find((category) => category.value === value);
  if (!match) return EVENT_CATEGORY_FALLBACK;
  return match;
}
