import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatThread } from '@/components/chat/chat-thread';
import { EmptyState } from '@/components/ui/empty-state';
import { EventIcon } from '@/components/events/event-icon';
import { InfoNote } from '@/components/ui/info-note';
import type { Message } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { eventCategory } from '@/lib/event-category';
import { formatEventTime } from '@/lib/format-time';
import { blockUser, enterEventChat, leaveEvent, leaveEventChat, sendGroupMessage, useStore } from '@/state/store';
import { useTheme } from '@/theme';

/** Group chat for a map event. Long-press someone's message to report or block them. */
export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, size, spacing } = useTheme();
  const event = useStore((state) => state.events.find((mapEvent) => mapEvent.id === id));
  const blockedIds = useStore((state) => state.blockedIds);
  const myId = useStore((state) => state.myId);

  // Load the chat history and listen for new messages while this screen is open.
  useEffect(() => {
    if (id) enterEventChat(id);
    return () => leaveEventChat();
  }, [id]);

  // No longer in the store: the server says the host deleted it.
  if (!event) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
        <ChatHeader onBack={() => router.back()}>
          <AppText variant="bodyStrong" accessibilityRole="header">
            Group chat
          </AppText>
        </ChatHeader>
        <EmptyState mascot="sleepy" title="This event was deleted" body="The host deleted it, and its group chat too." />
      </SafeAreaView>
    );
  }

  const leave = () =>
    Alert.alert('Leave this event?', 'You’ll leave the group chat too.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveEvent(event.id);
          } catch (error) {
            Alert.alert("Couldn't leave the event", errorMessage(error, 'Try again.'));
            return;
          }
          router.back();
        },
      },
    ]);

  const block = async (message: Message) => {
    try {
      await blockUser(message.senderId, message.senderName);
    } catch (error) {
      Alert.alert(`Couldn't block ${message.senderName}`, errorMessage(error, 'Try again.'));
      return;
    }
    // Blocking the host removes their event from the map, and this screen with it.
    if (message.senderId === event.host.id) router.back();
  };

  const moderate = (message: Message) =>
    Alert.alert(message.senderName, undefined, [
      {
        text: `Report ${message.senderName}`,
        onPress: () => {
          const params = { id: message.senderId, name: message.senderName };
          router.push({ pathname: '/report/[id]', params });
        },
      },
      {
        text: `Block ${message.senderName}`,
        style: 'destructive',
        onPress: () => void block(message),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  // Signed out (no myId) means you can't be the host.
  const hostedByMe = myId !== null && event.host.id === myId;
  // Hide messages from anyone you've blocked.
  const visibleMessages = event.messages.filter((message) => !blockedIds.includes(message.senderId));

  // Only guests get a Leave button; the host stays with their event.
  let leaveButton = null;
  if (!hostedByMe) {
    leaveButton = <Button label="Leave" variant="secondary" size="compact" onPress={leave} />;
  }

  let headerNote = 'Long-press a message to report or block someone.';
  if (hostedByMe) {
    headerNote = 'You created this event. Everyone who joins will chat here.';
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ChatHeader onBack={() => router.back()} trailing={leaveButton}>
        <View style={[styles.titleRow, { gap: spacing.sm }]}>
          <EventIcon value={event.emoji} size={size.avatarSmall} />
          <View style={styles.flex}>
            <AppText
              variant="bodyStrong"
              numberOfLines={1}
              accessibilityRole="header"
              accessibilityLabel={`${eventCategory(event.emoji).name}: ${event.title}`}>
              {event.title}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {`${event.memberCount} going · ${formatEventTime(event.startsAt)}`}
            </AppText>
          </View>
        </View>
      </ChatHeader>

      <ChatThread
        messages={visibleMessages}
        onSend={(text) => sendGroupMessage(event.id, text)}
        showSenderNames
        placeholder="Message the group"
        disabled={!event.joined}
        disabledText="Join the event to chat"
        onLongPressMessage={moderate}
        header={<InfoNote icon="people-outline">{headerNote}</InfoNote>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
