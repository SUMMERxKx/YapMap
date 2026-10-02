import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { SafetyMenu } from '@/components/safety-menu';
import { Screen } from '@/components/screen';
import { displayName } from '@/data/types';
import { endMatch, markSafetyTipSeen, useStore } from '@/state/store';
import { useTheme } from '@/theme';

const SAFETY_TIP_TIMES = 3;

export default function MatchScreen() {
  const { colors, radius, spacing } = useTheme();
  const match = useStore((s) => s.match);
  const me = useStore((s) => s.profile);
  const tipViews = useStore((s) => s.safetyTipViews);
  const [showTip] = useState(() => tipViews < SAFETY_TIP_TIMES); // decided once per match

  useEffect(() => {
    if (!match && router.canGoBack()) router.back();
  }, [match]);

  if (!match) return <Screen>{null}</Screen>;
  const { other } = match;

  const finish = (outcome: 'met' | 'cancelled') => {
    if (showTip) markSafetyTipSeen();
    endMatch(outcome);
  };

  if (match.status === 'other-cancelled') {
    return (
      <Screen footer={<Button label="Back to nearby list" onPress={() => finish('cancelled')} />}>
        <View style={[styles.center, { gap: spacing.md }]}>
          <AppText variant="title" align="center">{`${other.firstName} had to go`}</AppText>
          <AppText color="textSecondary" align="center">
            No worries. You're still available for someone else.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <>
          <Button label="We met" onPress={() => finish('met')} haptic />
          <Button label="Cancel" variant="ghost" onPress={() => finish('cancelled')} />
        </>
      }>
      <View style={styles.topRow}>
        <Badge label="Matched! Go and talk" />
        <SafetyMenu userId={other.id} firstName={displayName(other)} />
      </View>

      <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.lg }]}>
        <View style={styles.avatars}>
          <Avatar name={other.firstName} photoUri={other.photoUri} size={150} />
          <View style={[styles.mine, { borderColor: colors.background, borderRadius: 30 }]}>
            <Avatar name={me?.firstName ?? 'You'} photoUri={me?.photoUri ?? null} size={84} />
          </View>
        </View>
        <AppText variant="title" align="center" accessibilityRole="header">
          You and {other.firstName}
        </AppText>
        <AppText color="textSecondary" align="center">
          Walk over and say hello.
        </AppText>
      </View>

      <View style={[styles.note, { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: spacing.lg }]}>
        <AppText variant="label" color="greenText">
          {`HOW TO FIND ${other.firstName.toUpperCase()}`}
        </AppText>
        <AppText variant="heading" color="greenText">
          {other.note ? `"${other.note}"` : `${other.firstName} didn't add a note. Look for their photo.`}
        </AppText>
      </View>

      {showTip ? (
        <InfoNote icon="shield-checkmark-outline" title="Safety tip:">
          Stay in the public place. You can leave at any time, and you can report anything that felt off.
        </InfoNote>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  avatars: { width: 200, height: 170, alignItems: 'flex-start' },
  mine: { position: 'absolute', right: 0, bottom: 0, borderWidth: 4 },
  note: { gap: 6 },
});
