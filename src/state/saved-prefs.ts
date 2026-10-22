// Small things to remember on this phone between launches, per account: whether the
// tutorial was seen, and how many times the chat safety tip has been shown.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedPrefs = { seenTutorial: boolean; safetyTipViews: number };

const DEFAULT_PREFS: SavedPrefs = { seenTutorial: false, safetyTipViews: 0 };

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
    return { seenTutorial: parsed.seenTutorial === true, safetyTipViews };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Saves in the background; losing a write only means a tip shows once more. */
export function savePrefs(userId: string, prefs: SavedPrefs) {
  AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs)).catch(() => {});
}
