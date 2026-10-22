// A nearby person's profile sheet, with Say hi and the safety menu.

import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { PersonDetails, PersonDetailsSkeleton } from '@/components/profile/person-details';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { errorMessage } from '@/lib/error-message';
import { displayName } from '@/lib/format-person';
import { sayHi, useStore } from '@/state/store';

export default function PersonSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const outgoing = useStore((state) => state.outgoing);
  const chat = useStore((state) => state.chat);
  const incomingFrom = useStore((state) => state.incoming?.from);
  const nearby = useStore((state) => state.nearby);
  const live = useStore((state) => state.availability !== null);
  const chatPartner = chat?.other;

  // The person is usually in the shared nearby list, but a chat partner or an incoming
  // sender may not be (people in a chat are hidden from nearby) - the store has them too.
  const candidates = [chatPartner, incomingFrom, ...(nearby ?? [])];
  const person = candidates.find((candidate) => candidate?.id === id) ?? null;

  const close = <IconButton icon="close" label="Close" onPress={() => router.back()} />;

  if (!person) {
    // Still loading the first nearby list: placeholders in the shape of the profile.
    if (live && nearby === null) {
      return (
        <Screen surface="surface" edges={['bottom']}>
          <TopBar leading={close} />
          <PersonDetailsSkeleton />
        </Screen>
      );
    }
    return (
      <Screen surface="surface" edges={['bottom']}>
        <TopBar leading={close} />
        <EmptyState
          mascot="searching"
          title="They're not live any more"
          body="They went offline or moved away. There are more people to meet."
        />
      </Screen>
    );
  }

  const send = async () => {
    try {
      await sayHi(person); // the server checks proximity, blocks and rate limits
      router.replace('/waiting');
    } catch (error) {
      Alert.alert("Couldn't say hi", errorMessage(error, 'Try again.'));
    }
  };

  // Already chatting: no Say hi (with this person, or with anyone while a chat is going on).
  // Otherwise Say hi, unless a request is already waiting.
  const alreadyWaiting = outgoing?.status === 'pending';
  let action;
  if (chatPartner?.id === person.id) {
    action = <InfoNote icon="chatbubbles-outline">{`You're already chatting with ${person.firstName}.`}</InfoNote>;
  } else if (chat && chat.status === 'active') {
    action = (
      <InfoNote icon="chatbubbles-outline">
        {`Finish your chat with ${chat.other.firstName} first. You can say hi to ${person.firstName} after that.`}
      </InfoNote>
    );
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
        leading={close}
        trailing={<SafetyMenu userId={person.id} firstName={displayName(person)} onBlocked={() => router.back()} />}
      />

      <PersonDetails person={person} />
    </Screen>
  );
}
