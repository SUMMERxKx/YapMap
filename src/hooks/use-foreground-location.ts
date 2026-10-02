import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

type Result =
  | { ok: true; latitude: number | null; longitude: number | null }
  | { ok: false; reason: 'denied' };

/** Foreground ("while using the app") location only. Never background. */
export function useForegroundLocation() {
  const [denied, setDenied] = useState(false);

  const request = useCallback(async (): Promise<Result> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setDenied(true);
      return { ok: false, reason: 'denied' };
    }
    setDenied(false);
    try {
      // Indoors a fix can take a while; give up after 8 s and let the server use the last known one.
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      return {
        ok: true,
        latitude: position?.coords.latitude ?? null,
        longitude: position?.coords.longitude ?? null,
      };
    } catch {
      return { ok: true, latitude: null, longitude: null };
    }
  }, []);

  return { request, denied };
}
