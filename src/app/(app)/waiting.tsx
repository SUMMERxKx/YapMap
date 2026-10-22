// After "Say hi": waiting for the answer, with the 5-minute window and the silent "Not this time".

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { useCountdown } from '@/hooks/use-countdown';
import { formatClock } from '@/lib/format-time';
import { cancelRequest, clearOutgoing, expireOutgoing, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Waiting() {
  const { colors, radius, size, spacing } = useTheme();
  const outgoing = useStore((state) => state.outgoing);
  // Only a pending request has a countdown.
  let countdownTo: number | null = null;
  if (outgoing?.status === 'pending') {
    countdownTo = outgoing.expiresAt;
  }
  const left = useCountdown(countdownTo, expireOutgoing);

  if (!outgoing) {
    return <Screen>{null}</Screen>;
  }

  const name = outgoing.to.firstName;

  const cancel = async () => {
    router.back();
    try {
      await cancelRequest();
    } catch {
      Alert.alert("Couldn't cancel", `You're still waiting for ${name}. Check your connection and try again.`);
    }
  };

  // Same message whether they declined or the 5 minutes ran out.
  if (outgoing.status === 'not-this-time') {
    return (
      <Screen
        footer={
          <Button
            label="Back to nearby list"
            onPress={() => {
              clearOutgoing();
              router.back();
            }}
          />
        }>
        <EmptyState
          icon="leaf-outline"
          title="Not this time"
          body={`${name} couldn't chat right now. That's completely normal, and there are more people to meet.`}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button label="Back to nearby list" variant="secondary" onPress={() => router.back()} />
          <Button
            label="Cancel request"
            variant="ghost"
            onPress={() => void cancel()}
          />
        </>
      }>
      <AppText variant="label" color="textSecondary">
        REQUEST SENT
      </AppText>
      <View style={[styles.center, { gap: spacing.md }]}>
        <Avatar name={name} photoUri={outgoing.to.photoUri} size={size.avatarHero} ring />
        <AppText variant="title" align="center" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
          Waiting for {name}…
        </AppText>
        <AppText color="textSecondary" align="center">
          They have 5 minutes to answer.
        </AppText>
        <View
          accessibilityLabel={`${formatClock(left)} remaining`}
          style={[
            styles.timer,
            {
              backgroundColor: colors.greenSoft,
              borderRadius: radius.pill,
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            },
          ]}>
          <Ionicons name="timer-outline" size={size.iconMedium} color={colors.greenText} />
          <AppText variant="bodyStrong" color="greenText" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(left)} remaining
          </AppText>
        </View>
      </View>
      <InfoNote title="No pressure.">
        {`If ${name} can't chat or the time runs out, you'll just see "Not this time". Nobody keeps score.`}
      </InfoNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center' },
});
