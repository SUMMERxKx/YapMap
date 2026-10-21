// A nearby person's profile sheet, with Say hi and the safety menu.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PersonDetails } from '@/components/profile/person-details';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import * as api from '@/data/api';
import type { NearbyPerson } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { displayName } from '@/lib/format-person';
import { sayHi, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function PersonSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const blockedIds = useStore((state) => state.blockedIds);
  const outgoing = useStore((state) => state.outgoing);
  const chatPartner = useStore((state) => state.chat?.other);
  const incomingFrom = useStore((state) => state.incoming?.from);
  const chattingWith = chatPartner?.id;
  const [fetched, setFetched] = useState<NearbyPerson | null>(null);

  // The person is usually in the nearby list, but a chat partner or an incoming sender
  // may not be (people in a chat are hidden from nearby) - the store already has them.
  const known = [chatPartner, incomingFrom].find((candidate) => candidate?.id === id) ?? null;
  const person = known ?? fetched;

  useEffect(() => {
    if (known) return;
    api.nearby(blockedIds).then(
      (people) => {
        const match = people.find((nearbyPerson) => nearbyPerson.id === id);
        setFetched(match ?? null);
      },
      () => setFetched(null),
    );
  }, [id, blockedIds, known]);

  const alreadyWaiting = outgoing?.status === 'pending';

  if (!person) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const send = async () => {
    try {
      await sayHi(person); // the server checks proximity, blocks and rate limits
      router.replace('/waiting');
    } catch (error) {
      Alert.alert("Couldn't say hi", errorMessage(error, 'Try again.'));
    }
  };

  // Already chatting with this person: no Say hi. Otherwise Say hi, unless a request is already waiting.
  let action;
  if (chattingWith === person.id) {
    action = <InfoNote icon="chatbubbles-outline">{`You're already chatting with ${person.firstName}.`}</InfoNote>;
  } else {
    let waitingFor = '';
    if (outgoing) {
      waitingFor = displayName(outgoing.to);
    }
    action = (
      <>
        {alreadyWaiting && (
          <InfoNote>
            {`You're already waiting for ${waitingFor}. You can only have one request waiting at a time.`}
          </InfoNote>
        )}
        <Button
          label="Say hi"
          icon="chatbubble-ellipses-outline"
          onPress={() => void send()}
          disabled={alreadyWaiting}
          haptic
        />
      </>
    );
  }

  return (
    <Screen scroll surface="surface" edges={['bottom']} footer={action}>
      <TopBar
        leading={<IconButton icon="close" label="Close" onPress={() => router.back()} />}
        trailing={<SafetyMenu userId={person.id} firstName={displayName(person)} onBlocked={() => router.back()} />}
      />

      <PersonDetails person={person} />
    </Screen>
  );
}
