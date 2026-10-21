import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { loadEvents, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Used until we know where the user is (or if they don't share location).
const DEFAULT_REGION: Region = { latitude: 49.2827, longitude: -123.1207, latitudeDelta: 0.04, longitudeDelta: 0.04 };

/** Events on a map. Pins are events at places their hosts chose, never anyone's live location. */
export default function EventsMap() {
  const { colors, layout, radius, spacing, elevation } = useTheme();
  const events = useStore((state) => state.events);
  const map = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [showsUser, setShowsUser] = useState(false);

  // Centre the map on the user when we may use their location, then load the events there.
  useEffect(() => {
    let cancelled = false;

    const centreAndLoad = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setShowsUser(true);
        const position = await Location.getLastKnownPositionAsync();
        if (position && !cancelled) {
          const here = { ...DEFAULT_REGION, latitude: position.coords.latitude, longitude: position.coords.longitude };
          setRegion(here);
          map.current?.animateToRegion(here, 400);
          loadEvents(here);
          return;
        }
      }
      if (!cancelled) loadEvents(DEFAULT_REGION);
    };

    centreAndLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  const createAt = (latitude: number, longitude: number) =>
    router.push({ pathname: '/event/new', params: { lat: String(latitude), lng: String(longitude) } });

  return (
    <View style={styles.flex}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={showsUser}
        onRegionChangeComplete={setRegion}
        onLongPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          createAt(latitude, longitude);
        }}>
        {events.map((event) => {
          // Events you've joined get a filled green pin.
          let pinColor = colors.surface;
          let pinTextColor = colors.textPrimary;
          if (event.joined) {
            pinColor = colors.green;
            pinTextColor = colors.onGreen;
          }
          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
              accessibilityLabel={`${event.emoji} ${event.title}, ${event.memberCount} going`}
              tracksViewChanges={false}>
              <View style={[styles.pin, elevation.card, { backgroundColor: pinColor, borderColor: colors.green }]}>
                <AppText style={styles.pinEmoji} maxFontSizeMultiplier={1}>
                  {event.emoji}
                </AppText>
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
        </View>
      </SafeAreaView>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.lg }]}>
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
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pinEmoji: { fontSize: 15, lineHeight: 19 },
});
