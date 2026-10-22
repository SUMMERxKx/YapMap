// Small things to remember on this phone between launches, per account: how many times
// the chat safety tip has been shown, and how far around you the map looks for events.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { EVENT_RADIUS_KM } from '@/data/constants';

export type SavedPrefs = { safetyTipViews: number; eventRadiusKm: number };

const DEFAULT_PREFS: SavedPrefs = { safetyTipViews: 0, eventRadiusKm: EVENT_RADIUS_KM.default };

function storageKey(userId: string) {
  return `yap.prefs.${userId}`;
}

/** The saved prefs for this account, or the defaults when nothing was saved (or it can't be read). */
export async function loadPrefs(userId: string): Promise<SavedPrefs> {
  try {
    const saved = await AsyncStorage.getItem(storageKey(userId));
    if (!saved) return DEFAULT_PREFS;
    const parsed = JSON.parse(saved) as Partial<SavedPrefs>;
    let safetyTipViews = 0;
    if (typeof parsed.safetyTipViews === 'number') {
      safetyTipViews = parsed.safetyTipViews;
    }
    let eventRadiusKm = DEFAULT_PREFS.eventRadiusKm;
    if (typeof parsed.eventRadiusKm === 'number') {
      eventRadiusKm = clampRadiusKm(parsed.eventRadiusKm);
    }
    return { safetyTipViews, eventRadiusKm };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Saves in the background; losing a write only means a tip shows once more. */
export function savePrefs(userId: string, prefs: SavedPrefs) {
  AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs)).catch(() => {});
}

/** Forgets what was saved for this account (when the account is deleted). */
export function forgetPrefs(userId: string) {
  AsyncStorage.removeItem(storageKey(userId)).catch(() => {});
}

/** A whole number of kilometres inside the allowed range. */
export function clampRadiusKm(km: number) {
  return Math.min(Math.max(Math.round(km), EVENT_RADIUS_KM.min), EVENT_RADIUS_KM.max);
}
