import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button, IconButton } from '@/components/button';
import { ChatThread } from '@/components/chat-thread';
import { InfoNote } from '@/components/info-note';
import { SafetyMenu } from '@/components/safety-menu';
import { displayName } from '@/data/types';
import { endChat, markSafetyTipSeen, sendMessage, startChat, useStore } from '@/state/store';
import { useTheme } from '@/theme';

const SAFETY_TIP_TIMES = 3;

/** The 1:1 chat with your yap partner, opened when a request is accepted. */
export default function Chat() {
  const { colors, spacing } = useTheme();
  const chat = useStore((s) => s.chat);
  const tipViews = useStore((s) => s.safetyTipViews);
  const [showTip, setShowTip] = useState(() => tipViews < SAFETY_TIP_TIMES); // decided once per chat

  useEffect(() => {
    startChat();
  }, []);

  // The chat ended (by either side, or a block): close this screen.
  useEffect(() => {
    if (!chat && router.canGoBack()) router.back();
  }, [chat]);

  if (!chat) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} />;
  const { other } = chat;

  const end = () =>
    Alert.alert('End chat?', `Did you meet ${other.firstName}?`, [
      { text: 'Keep chatting', style: 'cancel' },
      { text: 'We met', onPress: () => finish('met') },
      { text: 'End chat', style: 'destructive', onPress: () => finish('cancelled') },
    ]);

  const finish = (outcome: 'met' | 'cancelled') => {
    if (showTip) markSafetyTipSeen();
    endChat(outcome);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.md, gap: spacing.sm }]}>
        {/* Going back keeps the chat alive; the bar on Go live and Nearby reopens it. */}
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName(other)}. View profile`}
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: other.id } })}
          style={[styles.who, { gap: spacing.sm }]}>
          <Avatar name={other.firstName} photoUri={other.photoUri} size={44} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {displayName(other)}
            </AppText>
            <AppText variant="caption" color="greenText">
              Your yap partner — go say hi
            </AppText>
          </View>
        </Pressable>
        <SafetyMenu userId={other.id} firstName={displayName(other)} />
        <Button label="End" variant="secondary" onPress={end} style={{ minHeight: 44, paddingHorizontal: 16 }} />
      </View>

      <ChatThread
        messages={chat.messages}
        onSend={sendMessage}
        placeholder={`Message ${other.firstName}`}
        disabled={chat.status === 'other-cancelled'}
        disabledText={`${other.firstName} ended the chat`}
        header={
          showTip ? (
            <InfoNote
              icon="shield-checkmark-outline"
              title="Safety tip:"
              onDismiss={() => {
                markSafetyTipSeen();
                setShowTip(false);
              }}>
              Meet in the public place you're both in. You can leave at any time, and report anything that felt off.
            </InfoNote>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center' },
});
