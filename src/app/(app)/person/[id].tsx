// A nearby person's profile sheet, with Say hi and the safety menu.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PersonDetails } from '@/components/profile/person-details';
import { SafetyMenu } from '@/components/safety/safety-menu';
import * as api from '@/data/api';
import { displayName, type NearbyPerson } from '@/data/types';
import { sayHi, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function PersonSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const blockedIds = useStore((s) => s.blockedIds);
  const outgoing = useStore((s) => s.outgoing);
  const chattingWith = useStore((s) => s.chat?.other.id);
  const [person, setPerson] = useState<NearbyPerson | null>(null);

  useEffect(() => {
    api.nearby(blockedIds).then((list) => setPerson(list.find((p) => p.id === id) ?? null));
  }, [id, blockedIds]);

  const alreadyWaiting = outgoing?.status === 'pending';

  if (!person) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const send = () => {
    sayHi(person);
    router.replace('/waiting');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
      <View style={styles.topRow}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        <SafetyMenu userId={person.id} firstName={displayName(person)} onBlocked={() => router.back()} />
      </View>

      <PersonDetails person={person} />

      {chattingWith === person.id ? (
        <InfoNote icon="chatbubbles-outline">{`You're already chatting with ${person.firstName}.`}</InfoNote>
      ) : (
        <>
          {alreadyWaiting ? (
            <InfoNote>
              {`You're already waiting for ${outgoing ? displayName(outgoing.to) : ''}. You can only have one request waiting at a time.`}
            </InfoNote>
          ) : null}
          <Button label="Say hi" icon="chatbubble-ellipses-outline" onPress={send} disabled={alreadyWaiting} haptic />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
