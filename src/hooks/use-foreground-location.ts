import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

type Result =
  | { ok: true; latitude: number | null; longitude: number | null; accuracy: number | null }
  | { ok: false; reason: 'denied' };

// Indoors a fix can take a while; give up after this long and use a recent position instead.
export const FIX_TIMEOUT_MS = 8000;

// A position the phone already knows is still good for finding people nearby if it is at most this old.
const RECENT_POSITION_MS = 5 * 60 * 1000;

/**
 * Foreground ("while using the app") location only. Never background. `request` never throws:
 * a phone that can't answer (location services off, the app in the background) gives no
 * position, which callers already handle.
 */
export function useForegroundLocation() {
  const [denied, setDenied] = useState(false);

  const request = useCallback(async (): Promise<Result> => {
    let status;
    try {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    } catch {
      return { ok: true, latitude: null, longitude: null, accuracy: null };
    }
    if (status !== 'granted') {
      setDenied(true);
      return { ok: false, reason: 'denied' };
    }
    setDenied(false);
    const currentPosition = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
    // Whichever finishes first wins: the position, or null when the timeout runs out.
    let position = await Promise.race([currentPosition, timeout]).catch(() => null);
    if (!position) {
      // No fresh fix in time (often indoors): a position from the last few minutes will do.
      position = await Location.getLastKnownPositionAsync({ maxAge: RECENT_POSITION_MS }).catch(() => null);
    }
    if (!position) {
      return { ok: true, latitude: null, longitude: null, accuracy: null };
    }
    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      // The server keeps it (as 0 to 50 m); it doesn't change who is nearby.
      accuracy: position.coords.accuracy,
    };
  }, []);

  return { request, denied };
}
