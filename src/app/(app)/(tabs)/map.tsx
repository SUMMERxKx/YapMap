import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { EventIcon } from '@/components/events/event-icon';
import { Button, IconButton } from '@/components/ui/button';
import { FIX_TIMEOUT_MS } from '@/hooks/use-foreground-location';
import { eventCategory } from '@/lib/event-category';
import { loadEvents, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Used until we know where the user is (or if they don't share location).
const DEFAULT_REGION: Region = { latitude: 49.2827, longitude: -123.1207, latitudeDelta: 0.04, longitudeDelta: 0.04 };

// A position the phone already knows is good enough if it is at most this old.
const RECENT_POSITION_MS = 2 * 60 * 1000;

const PIN_ICON_SIZE = 24;
const PIN_PADDING = 4;

// Where the map is with the user's location:
// checking    - still asking the phone
// found       - centred on the user
// denied      - the user said no (askAgain: whether the phone will show the prompt again)
// unavailable - allowed, but the phone couldn't get a fix in time
type LocationState =
  | { status: 'checking' }
  | { status: 'found' }
  | { status: 'denied'; askAgain: boolean }
  | { status: 'unavailable' };

type FindResult =
  | { status: 'found'; latitude: number; longitude: number }
  | { status: 'denied'; askAgain: boolean }
  | { status: 'unavailable' };

/**
 * Finds the user. Asks for "while using the app" permission only when they haven't decided yet,
 * then uses a recent position the phone already has, or else asks for a fresh fix, and if that
 * fails too, uses whatever position the phone last knew, however old.
 */
async function findUser(): Promise<FindResult> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status === 'undetermined') {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status !== 'granted') {
    return { status: 'denied', askAgain: permission.canAskAgain };
  }

  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_POSITION_MS }).catch(() => null);
  if (recent) {
    return { status: 'found', latitude: recent.coords.latitude, longitude: recent.coords.longitude };
  }
  // Indoors a fresh fix can take a while; whichever finishes first wins, the fix or the timeout.
  const currentPosition = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
  const current = await Promise.race([currentPosition, timeout]).catch(() => null);
  if (current) {
    return { status: 'found', latitude: current.coords.latitude, longitude: current.coords.longitude };
  }
  const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
  if (lastKnown) {
    return { status: 'found', latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }
  return { status: 'unavailable' };
}

/** Events on a map. Pins are events at places their hosts chose, never anyone's live location. */
export default function EventsMap() {
  const { colors, layout, radius, spacing, elevation } = useTheme();
  const events = useStore((state) => state.events);
  const map = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [location, setLocation] = useState<LocationState>({ status: 'checking' });
  // Events are loaded around Vancouver only once, if we never find the user.
  const loadedFallback = useRef(false);
  // Read when the app comes back to the front: only then is it worth asking the phone again.
  const wasDenied = useRef(false);

  // Centres the map on the user when we found them, and loads the events there.
  const showResult = (result: FindResult) => {
    wasDenied.current = result.status === 'denied';
    if (result.status === 'found') {
      const here = { ...DEFAULT_REGION, latitude: result.latitude, longitude: result.longitude };
      setLocation({ status: 'found' });
      setRegion(here);
      map.current?.animateToRegion(here, 400);
      loadEvents(here);
      return;
    }
    setLocation(result);
    if (!loadedFallback.current) {
      loadedFallback.current = true;
      loadEvents(DEFAULT_REGION);
    }
  };

  // The map stays usable while this runs.
  const centreOnUser = async () => {
    const result = await findUser();
    showResult(result);
  };

  // On open: find the user (asking for permission the first time).
  useEffect(() => {
    let cancelled = false;
    findUser().then((result) => {
      if (!cancelled) showResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back from the phone's Settings after turning location on: try again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && wasDenied.current) {
        findUser().then(showResult);
      }
    });
    return () => subscription.remove();
  }, []);

  // "Turn on location": ask again if the phone still allows it, otherwise open Settings.
  const turnOnLocation = async () => {
    if (location.status === 'denied' && !location.askAgain) {
      Linking.openSettings();
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status === 'granted') {
      centreOnUser();
    } else {
      showResult({ status: 'denied', askAgain: permission.canAskAgain });
    }
  };

  // A short note under the banner when we couldn't centre on the user.
  let locationPrompt = null;
  if (location.status === 'denied') {
    locationPrompt = (
      <View style={[styles.prompt, { gap: spacing.sm, marginTop: spacing.sm }]}>
        <AppText variant="caption" color="textSecondary">
          Showing events around Vancouver. Turn on location to see the ones near you.
        </AppText>
        <Button label="Turn on location" variant="secondary" size="compact" onPress={turnOnLocation} />
      </View>
    );
  } else if (location.status === 'unavailable') {
    locationPrompt = (
      <View style={[styles.prompt, { gap: spacing.sm, marginTop: spacing.sm }]}>
        <AppText variant="caption" color="textSecondary">
          We couldn't find your location just now.
        </AppText>
        <Button label="Try again" variant="secondary" size="compact" onPress={centreOnUser} />
      </View>
    );
  }

  const createAt = (latitude: number, longitude: number) =>
    router.push({ pathname: '/event/new', params: { lat: String(latitude), lng: String(longitude) } });

  return (
    <View style={styles.flex}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={location.status === 'found'}
        onRegionChangeComplete={setRegion}
        onLongPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          createAt(latitude, longitude);
        }}>
        {events.map((event) => {
          // Events you've joined get a filled green pin, with a light badge so the icon still shows.
          let pinColor = colors.surface;
          let pinTextColor = colors.textPrimary;
          let iconTone: 'solid' | 'inverse' = 'solid';
          if (event.joined) {
            pinColor = colors.green;
            pinTextColor = colors.onGreen;
            iconTone = 'inverse';
          }
          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
              accessibilityLabel={`${eventCategory(event.emoji).name}: ${event.title}, ${event.memberCount} going`}
              tracksViewChanges={false}>
              <View style={[styles.pin, elevation.card, { backgroundColor: pinColor, borderColor: colors.green }]}>
                <EventIcon value={event.emoji} size={PIN_ICON_SIZE} tone={iconTone} />
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={{ color: pinTextColor, fontWeight: '700', maxWidth: 140 }}>
                  {event.title}
                </AppText>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.overlay}>
        <View
          style={[
            styles.banner,
            elevation.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              marginHorizontal: layout.screenPadding,
              marginTop: spacing.sm,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              gap: spacing.xxs,
            },
          ]}>
          <AppText variant="bodyStrong">Events near you</AppText>
          <AppText variant="caption" color="textSecondary">
            Long-press the map to create one. Pins show events, never where people are.
          </AppText>
          {locationPrompt}
        </View>
      </SafeAreaView>

      <View
        pointerEvents="box-none"
        style={[styles.bottom, { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.lg, gap: spacing.md }]}>
        {location.status === 'found' && (
          <View style={[styles.recentre, elevation.floating, { borderRadius: layout.touchTarget / 2 }]}>
            <IconButton icon="locate" label="Centre the map on me" onPress={centreOnUser} />
          </View>
        )}
        <Button
          label="Create event here"
          icon="add-circle-outline"
          onPress={() => createAt(region.latitude, region.longitude)}
          style={elevation.floating}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: { borderWidth: StyleSheet.hairlineWidth },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  prompt: { alignItems: 'flex-start' },
  recentre: { alignSelf: 'flex-end' },
  // The pin's corners follow the badge's corners, the badge inset by the pin's padding.
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: PIN_PADDING,
    paddingRight: 10,
    paddingVertical: PIN_PADDING,
    borderRadius: Math.round(PIN_ICON_SIZE * 0.3) + PIN_PADDING,
    borderWidth: 1.5,
  },
});
