import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatThread } from '@/components/chat/chat-thread';
import { InfoNote } from '@/components/ui/info-note';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { displayName } from '@/lib/format-person';
import { endChat, markSafetyTipSeen, sendMessage, startChat, useStore } from '@/state/store';
import { useTheme } from '@/theme';

const SAFETY_TIP_TIMES = 3;

/** The 1:1 chat with your yap partner, opened when a request is accepted. */
export default function Chat() {
  const { colors, size, spacing } = useTheme();
  const chat = useStore((state) => state.chat);
  const tipViews = useStore((state) => state.safetyTipViews);
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

  const dismissTip = () => {
    markSafetyTipSeen();
    setShowTip(false);
  };

  // A safety tip above the first message, for someone's first few chats.
  let safetyTip;
  if (showTip) {
    safetyTip = (
      <InfoNote icon="shield-checkmark-outline" title="Safety tip:" onDismiss={dismissTip}>
        Meet in the public place you're both in. You can leave at any time, and report anything that felt off.
      </InfoNote>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Going back keeps the chat alive; the bar on Go live and Nearby reopens it. */}
      <ChatHeader
        onBack={() => router.back()}
        trailing={
          <>
            <SafetyMenu userId={other.id} firstName={displayName(other)} />
            <Button label="End" variant="secondary" size="compact" onPress={end} />
          </>
        }>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName(other)}. View profile`}
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: other.id } })}
          style={[styles.who, { gap: spacing.sm }]}>
          <Avatar name={other.firstName} photoUri={other.photoUri} size={size.avatarSmall} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {displayName(other)}
            </AppText>
            <AppText variant="caption" color="greenText" numberOfLines={1}>
              Your yap partner — go say hi
            </AppText>
          </View>
        </Pressable>
      </ChatHeader>

      <ChatThread
        messages={chat.messages}
        onSend={sendMessage}
        placeholder={`Message ${other.firstName}`}
        disabled={chat.status === 'other-cancelled'}
        disabledText={`${other.firstName} ended the chat`}
        header={safetyTip}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  who: { flexDirection: 'row', alignItems: 'center' },
});
