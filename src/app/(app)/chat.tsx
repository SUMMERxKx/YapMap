import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ChatThread } from '@/components/chat-thread';
import { InfoNote } from '@/components/info-note';
import { SafetyMenu } from '@/components/safety-menu';
import { displayName } from '@/data/types';
import { endMatch, markSafetyTipSeen, sendMessage, startChat, useStore } from '@/state/store';
import { useTheme } from '@/theme';

const SAFETY_TIP_TIMES = 3;

/** The 1:1 chat that opens when a request is accepted. */
export default function Chat() {
  const { colors, spacing } = useTheme();
  const match = useStore((s) => s.match);
  const tipViews = useStore((s) => s.safetyTipViews);
  const [showTip, setShowTip] = useState(() => tipViews < SAFETY_TIP_TIMES); // decided once per chat

  useEffect(() => {
    startChat();
  }, []);

  useEffect(() => {
    if (!match && router.canGoBack()) router.back();
  }, [match]);

  if (!match) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} />;
  const { other } = match;

  const end = () =>
    Alert.alert('End chat?', `Did you meet ${other.firstName}?`, [
      { text: 'Keep chatting', style: 'cancel' },
      { text: 'We met', onPress: () => finish('met') },
      { text: 'End chat', style: 'destructive', onPress: () => finish('cancelled') },
    ]);

  const finish = (outcome: 'met' | 'cancelled') => {
    if (showTip) markSafetyTipSeen();
    endMatch(outcome);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.md }]}>
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
              Matched, go and say hi
            </AppText>
          </View>
        </Pressable>
        <SafetyMenu userId={other.id} firstName={displayName(other)} />
        <Button label="End" variant="secondary" onPress={end} style={{ minHeight: 44, paddingHorizontal: 16 }} />
      </View>

      <ChatThread
        messages={match.messages}
        onSend={sendMessage}
        placeholder={`Message ${other.firstName}`}
        disabled={match.status === 'other-cancelled'}
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
