import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { SafetyMenu } from '@/components/safety-menu';
import { Screen } from '@/components/screen';
import { formatClock, useCountdown } from '@/hooks/use-countdown';
import { expireIncoming, respondToIncoming, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Incoming() {
  const { colors, radius, spacing } = useTheme();
  const incoming = useStore((s) => s.incoming);
  const left = useCountdown(incoming?.expiresAt, expireIncoming);

  useEffect(() => {
    if (incoming) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [incoming]);

  // Answered, expired or blocked: close the screen.
  useEffect(() => {
    if (!incoming && router.canGoBack()) router.back();
  }, [incoming]);

  if (!incoming) return <Screen>{null}</Screen>;
  const { from } = incoming;

  return (
    <Screen
      footer={
        // Equal size and weight: saying "Not now" should feel as normal as saying yes.
        <View style={styles.buttons}>
          <Button label="Not now" variant="secondary" onPress={() => respondToIncoming(false)} style={styles.flex} />
          <Button label="Accept" onPress={() => respondToIncoming(true)} style={styles.flex} haptic />
        </View>
      }>
      <View style={styles.topRow}>
        <View style={styles.headline}>
          <View style={[styles.dot, { backgroundColor: colors.green }]} />
          <AppText variant="bodyStrong" color="greenText" accessibilityRole="header">
            Someone wants to chat
          </AppText>
        </View>
        <SafetyMenu userId={from.id} firstName={from.firstName} />
      </View>

      <View style={[styles.center, { gap: spacing.md }]}>
        <Avatar name={from.firstName} photoUri={from.photoUri} size={160} />
        <AppText variant="display">{from.firstName}</AppText>
        <AppText color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
          {formatClock(left)} to answer
        </AppText>
        <View
          style={[
            styles.intro,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
          ]}>
          <AppText variant="label" color="textSecondary">
            INTRO
          </AppText>
          <AppText>{from.intro}</AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 6, alignSelf: 'stretch', borderWidth: StyleSheet.hairlineWidth },
  buttons: { flexDirection: 'row', gap: 12 },
});
