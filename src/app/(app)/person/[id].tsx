import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button, IconButton } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { SafetyMenu } from '@/components/safety-menu';
import * as api from '@/data/api';
import type { NearbyPerson } from '@/data/types';
import { sayHi, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function PersonSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const blockedIds = useStore((s) => s.blockedIds);
  const outgoing = useStore((s) => s.outgoing);
  const [person, setPerson] = useState<NearbyPerson | null>(null);

  useEffect(() => {
    api.nearby(blockedIds).then((list) => setPerson(list.find((p) => p.id === id) ?? null));
  }, [id, blockedIds]);

  const alreadyWaiting = outgoing?.status === 'pending';

  if (!person) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const send = () => {
    sayHi(person.id, person.firstName, person.intro, person.photoUri);
    router.replace('/waiting');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
      <View style={styles.topRow}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        <SafetyMenu userId={person.id} firstName={person.firstName} onBlocked={() => router.back()} />
      </View>

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={person.firstName} photoUri={person.photoUri} size={160} />
        <AppText variant="title" accessibilityRole="header">
          {person.firstName}
        </AppText>
      </View>

      <View style={[styles.intro, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }]}>
        <AppText variant="label" color="textSecondary">
          INTRO
        </AppText>
        <AppText variant="body">{person.intro}</AppText>
      </View>

      {alreadyWaiting ? (
        <InfoNote>
          {`You're already waiting for ${outgoing?.to.firstName}. You can only have one request waiting at a time.`}
        </InfoNote>
      ) : null}

      <Button label="Say hi" icon="chatbubble-ellipses-outline" onPress={send} disabled={alreadyWaiting} haptic />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  intro: { gap: 6, borderWidth: StyleSheet.hairlineWidth },
});
