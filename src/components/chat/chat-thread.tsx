import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIMITS } from '@/data/constants';
import type { Message } from '@/data/types';
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

  let keyboardBehavior: 'padding' | undefined;
  if (Platform.OS === 'ios') {
    keyboardBehavior = 'padding';
  }

  // Inverted so the newest message sits at the bottom and the list starts there.
  const newestFirst = [...messages].reverse();

  let footer = null;
  if (header) {
    footer = <View style={{ marginBottom: spacing.md }}>{header}</View>;
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === 'me';
    // In the inverted list the previous message in time is at index + 1.
    const older = newestFirst[index + 1];
    const sameSenderAsOlder = older?.senderId === item.senderId;
    const showName = Boolean(showSenderNames) && !mine && !sameSenderAsOlder;

    let senderLabel = item.senderName;
    let onLongPress: (() => void) | undefined;
    let rowAlign: 'flex-start' | 'flex-end' = 'flex-start';
    let bubbleColor = colors.surface;
    let bubbleBorderColor = colors.border;
    let bottomRightRadius: number = radius.lg;
    let bottomLeftRadius: number = 6;
    let textColor = colors.textPrimary;

    if (mine) {
      senderLabel = 'You';
      rowAlign = 'flex-end';
      bubbleColor = colors.green;
      bubbleBorderColor = colors.green;
      bottomRightRadius = 6;
      bottomLeftRadius = radius.lg;
      textColor = colors.onGreen;
    } else if (onLongPressMessage) {
      onLongPress = () => onLongPressMessage(item);
    }

    return (
      <Pressable
        accessibilityRole="text"
        accessibilityLabel={`${senderLabel}: ${item.text}`}
        onLongPress={onLongPress}
        style={[styles.row, { justifyContent: rowAlign }]}>
        <View style={{ maxWidth: '80%', gap: 2 }}>
          {showName && (
            <AppText variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
              {item.senderName}
            </AppText>
          )}
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: bubbleColor,
                borderColor: bubbleBorderColor,
                borderRadius: radius.lg,
                borderBottomRightRadius: bottomRightRadius,
                borderBottomLeftRadius: bottomLeftRadius,
              },
            ]}>
            <AppText style={{ color: textColor }}>{item.text}</AppText>
          </View>
        </View>
      </Pressable>
    );
  };

  const canSend = text.trim() !== '';
  let sendBackground = colors.surfaceMuted;
  let sendIconColor = colors.textSecondary;
  if (canSend) {
    sendBackground = colors.green;
    sendIconColor = colors.onGreen;
  }

  let composerContent;
  if (disabled) {
    composerContent = (
      <AppText color="textSecondary" align="center" style={{ flex: 1, paddingVertical: spacing.md }}>
        {disabledText}
      </AppText>
    );
  } else {
    composerContent = (
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
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={[styles.send, { backgroundColor: sendBackground }]}>
          <Ionicons name="arrow-up" size={22} color={sendIconColor} />
        </Pressable>
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior}>
      <FlatList
        style={styles.flex}
        inverted
        data={newestFirst}
        keyExtractor={(message) => message.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListFooterComponent={footer}
        renderItem={renderMessage}
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
        {composerContent}
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
