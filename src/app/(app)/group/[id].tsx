import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { ChatThread } from '@/components/chat/chat-thread';
import { InfoNote } from '@/components/ui/info-note';
import type { Message } from '@/data/types';
import { formatEventTime } from '@/lib/format-time';
import { blockUser, enterEventChat, leaveEvent, leaveEventChat, sendGroupMessage, useStore } from '@/state/store';
import { useTheme } from '@/theme';

/** Group chat for a map event. Long-press someone's message to report or block them. */
export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const event = useStore((s) => s.events.find((e) => e.id === id));
  const blockedIds = useStore((s) => s.blockedIds);

  // Load the chat history and listen for new messages while this screen is open.
  useEffect(() => {
    if (id) void enterEventChat(id);
    return () => leaveEventChat();
  }, [id]);

  if (!event) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} />;

  const leave = () =>
    Alert.alert('Leave this event?', 'You’ll leave the group chat too.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveEvent(event.id);
          router.back();
        },
      },
    ]);

  const moderate = (message: Message) =>
    Alert.alert(message.senderName, undefined, [
      {
        text: `Report ${message.senderName}`,
        onPress: () => router.push({ pathname: '/report/[id]', params: { id: message.senderId, name: message.senderName } }),
      },
      {
        text: `Block ${message.senderName}`,
        style: 'destructive',
        onPress: () => blockUser(message.senderId, message.senderName),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.md }]}>
        <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1} accessibilityRole="header">
            {event.emoji} {event.title}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {`${event.memberCount} going · ${formatEventTime(event.startsAt)}`}
          </AppText>
        </View>
        {event.host.id !== 'me' ? (
          <Button label="Leave" variant="secondary" onPress={leave} style={{ minHeight: 44, paddingHorizontal: 16 }} />
        ) : null}
      </View>

      <ChatThread
        messages={event.messages.filter((m) => !blockedIds.includes(m.senderId))}
        onSend={(text) => sendGroupMessage(event.id, text)}
        showSenderNames
        placeholder="Message the group"
        disabled={!event.joined}
        disabledText="Join the event to chat"
        onLongPressMessage={moderate}
        header={
          <InfoNote icon="people-outline">
            {event.host.id === 'me'
              ? 'You created this event. Everyone who joins will chat here.'
              : 'Long-press a message to report or block someone.'}
          </InfoNote>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth },
});
