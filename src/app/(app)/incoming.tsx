// Someone said hi: their profile, with Accept and Not now carrying equal weight.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { PersonDetails } from '@/components/profile/person-details';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { Screen } from '@/components/ui/screen';
import { displayName } from '@/data/types';
import { useCountdown } from '@/hooks/use-countdown';
import { formatClock } from '@/lib/format-time';
import { expireIncoming, respondToIncoming, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Incoming() {
  const { colors } = useTheme();
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
      scroll
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
        <SafetyMenu userId={from.id} firstName={displayName(from)} />
      </View>

      <PersonDetails person={from} subtitle={`${formatClock(left)} to answer`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  buttons: { flexDirection: 'row', gap: 12 },
});
