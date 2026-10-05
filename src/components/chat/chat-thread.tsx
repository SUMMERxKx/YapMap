import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Message } from '@/data/types';
import { LIMITS } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  messages: Message[];
  onSend: (text: string) => void;
  showSenderNames?: boolean; // for group chats
  placeholder?: string;
  disabled?: boolean;
  disabledText?: string;
  header?: ReactElement; // shown above the first message (e.g. a safety tip)
  onLongPressMessage?: (message: Message) => void; // e.g. report or block the sender
};

/** Message list and composer, shared by 1:1 chats and event group chats. */
export function ChatThread({
  messages,
  onSend,
  showSenderNames,
  placeholder = 'Message',
  disabled,
  disabledText,
  header,
  onLongPressMessage,
}: Props) {
  const { colors, radius, spacing, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        style={styles.flex}
        // Inverted so the newest message sits at the bottom and the list starts there.
        inverted
        data={[...messages].reverse()}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListFooterComponent={header ? <View style={{ marginBottom: spacing.md }}>{header}</View> : null}
        renderItem={({ item, index }) => {
          const mine = item.senderId === 'me';
          // In the inverted list the previous message in time is at index + 1.
          const older = [...messages].reverse()[index + 1];
          const showName = showSenderNames && !mine && older?.senderId !== item.senderId;
          return (
            <Pressable
              accessibilityRole="text"
              accessibilityLabel={`${mine ? 'You' : item.senderName}: ${item.text}`}
              onLongPress={!mine && onLongPressMessage ? () => onLongPressMessage(item) : undefined}
              style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              <View style={{ maxWidth: '80%', gap: 2 }}>
                {showName ? (
                  <AppText variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
                    {item.senderName}
                  </AppText>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine ? colors.green : colors.surface,
                      borderColor: mine ? colors.green : colors.border,
                      borderRadius: radius.lg,
                      borderBottomRightRadius: mine ? 6 : radius.lg,
                      borderBottomLeftRadius: mine ? radius.lg : 6,
                    },
                  ]}>
                  <AppText style={{ color: mine ? colors.onGreen : colors.textPrimary }}>{item.text}</AppText>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
          },
        ]}>
        {disabled ? (
          <AppText color="textSecondary" align="center" style={{ flex: 1, paddingVertical: spacing.md }}>
            {disabledText}
          </AppText>
        ) : (
          <>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={placeholder}
              multiline
              maxLength={LIMITS.message}
              style={[
                type.body,
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.background,
                  borderColor: colors.inputBorder,
                  borderRadius: radius.xl,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !text.trim() }}
              disabled={!text.trim()}
              onPress={send}
              style={[styles.send, { backgroundColor: text.trim() ? colors.green : colors.surfaceMuted }]}>
              <Ionicons name="arrow-up" size={22} color={text.trim() ? colors.onGreen : colors.textSecondary} />
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth },
  composer: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderWidth: 1 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
