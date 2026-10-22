import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayName } from '@/lib/format-person';
import { dismissNearbyAlert, useStore } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { useGuardedPress } from '@/components/ui/press-feedback';

const SHOW_FOR_MS = 8000;

/** "Someone is near you" prompt that slides in at the top while you're live. */
export function NearbyToast() {
  const alert = useStore((state) => state.nearbyAlert);
  const { colors, radius, size, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(dismissNearbyAlert, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  // While the toast slides away it can still be tapped; a second tap must not open it twice.
  const open = useGuardedPress(() => {
    if (!alert) return;
    dismissNearbyAlert();
    if (alert.kind === 'person') {
      router.push({ pathname: '/person/[id]', params: { id: alert.person.id } });
    } else {
      router.navigate('/nearby');
    }
  });

  if (!alert) return null;

  let title;
  let body;
  let action;
  let picture;
  if (alert.kind === 'person') {
    title = `${displayName(alert.person)} is near you`;
    body = 'They’re live and up for a chat.';
    action = 'Say hi';
    picture = (
      <Avatar
        name={alert.person.firstName}
        photoUri={alert.person.photoUri}
        thumbUri={alert.person.thumbUri}
        size={size.avatarSmall}
      />
    );
  } else {
    title = `${alert.count} people near you are up for a chat`;
    body = 'See who’s around and say hi.';
    action = 'See them';
    picture = (
      <View style={[styles.icon, { backgroundColor: colors.greenSoft }]}>
        <Ionicons name="people" size={size.iconMedium} color={colors.greenText} />
      </View>
    );
  }

  return (
    <Animated.View
      key={alert.id}
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + spacing.sm, paddingHorizontal: spacing.md }]}>
      <View
        style={[
          styles.card,
          elevation.floating,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
        ]}>
        {picture}
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {body}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={open.onPress}
          hitSlop={4}
          style={[styles.action, { paddingHorizontal: spacing.md, backgroundColor: colors.green, borderRadius: radius.pill }]}>
          <AppText variant="caption" style={{ color: colors.onGreen, fontWeight: '700' }}>
            {action}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismissNearbyAlert} hitSlop={12}>
          <Ionicons name="close" size={size.iconMedium} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 50 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  action: { minHeight: 36, justifyContent: 'center' },
});
