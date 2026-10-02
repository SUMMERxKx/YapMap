import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { Screen } from '@/components/screen';
import { formatClock, useCountdown } from '@/hooks/use-countdown';
import { cancelRequest, clearOutgoing, expireOutgoing, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Waiting() {
  const { colors, radius, spacing } = useTheme();
  const outgoing = useStore((s) => s.outgoing);
  const left = useCountdown(outgoing?.status === 'pending' ? outgoing.expiresAt : null, expireOutgoing);

  if (!outgoing) {
    return <Screen>{null}</Screen>;
  }

  const name = outgoing.to.firstName;

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
        <View style={[styles.center, { gap: spacing.md }]}>
          <Ionicons name="leaf-outline" size={48} color={colors.textSecondary} />
          <AppText variant="title" align="center" accessibilityRole="header">
            Not this time
          </AppText>
          <AppText color="textSecondary" align="center">
            {`${name} couldn't chat right now. That's completely normal, and there are more people to meet.`}
          </AppText>
        </View>
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
            onPress={() => {
              cancelRequest();
              router.back();
            }}
          />
        </>
      }>
      <AppText variant="label" color="textSecondary">
        REQUEST SENT
      </AppText>
      <View style={[styles.center, { gap: spacing.md }]}>
        <Avatar name={name} photoUri={outgoing.to.photoUri} size={140} ring />
        <AppText variant="title" align="center" accessibilityRole="header">
          Waiting for {name}…
        </AppText>
        <AppText color="textSecondary" align="center">
          They have 5 minutes to answer.
        </AppText>
        <View
          accessibilityLabel={`${formatClock(left)} remaining`}
          style={[styles.timer, { backgroundColor: colors.greenSoft, borderRadius: radius.pill }]}>
          <Ionicons name="timer-outline" size={18} color={colors.greenText} />
          <AppText variant="bodyStrong" color="greenText" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(left)} remaining
          </AppText>
        </View>
        <InfoNote title="No pressure.">
          {`If ${name} can't chat or the time runs out, you'll just see "Not this time". Nobody keeps score.`}
        </InfoNote>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
});
