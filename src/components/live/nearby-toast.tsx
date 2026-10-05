import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayName } from '@/data/types';
import { dismissNearbyAlert, useStore } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';

const SHOW_FOR_MS = 8000;

/** "Someone is near you" prompt that slides in at the top while you're live. */
export function NearbyToast() {
  const alert = useStore((s) => s.nearbyAlert);
  const { colors, radius, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(dismissNearbyAlert, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  const isPerson = alert.kind === 'person';
  const title = isPerson
    ? `${displayName(alert.person)} is near you`
    : `${alert.count} people near you are up for a chat`;
  const body = isPerson ? 'They’re live and up for a chat.' : 'See who’s around and say hi.';
  const action = isPerson ? 'Say hi' : 'See them';

  const open = () => {
    dismissNearbyAlert();
    if (alert.kind === 'person') {
      router.push({ pathname: '/person/[id]', params: { id: alert.person.id } });
    } else {
      router.navigate('/nearby');
    }
  };

  return (
    <Animated.View
      key={alert.id}
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}>
      <View
        style={[
          styles.card,
          elevation.floating,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
        ]}>
        {isPerson ? (
          <Avatar name={alert.person.firstName} photoUri={alert.person.photoUri} size={44} />
        ) : (
          <View style={[styles.icon, { backgroundColor: colors.greenSoft }]}>
            <Ionicons name="people" size={22} color={colors.greenText} />
          </View>
        )}
        <View style={{ flex: 1 }}>
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
          onPress={open}
          style={[styles.action, { backgroundColor: colors.green, borderRadius: radius.pill }]}>
          <AppText variant="caption" style={{ color: colors.onGreen, fontWeight: '700' }}>
            {action}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismissNearbyAlert} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 50 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  action: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
});
