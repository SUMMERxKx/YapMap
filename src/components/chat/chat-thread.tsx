import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactElement } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIMITS } from '@/data/constants';
import type { Message } from '@/data/types';
import { hasVisibleText } from '@/lib/clean-text';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  messages: Message[];
  onSend: (text: string) => Promise<boolean>; // false when it wasn't sent
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
  const { colors, layout, radius, size, spacing, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const send = async () => {
    const draft = text;
    if (!hasVisibleText(draft)) return;
    // Cleared straight away, so a second tap has nothing to send twice.
    setText('');
    const sent = await onSend(draft);
    // Not sent (offline, say): put the text back so nothing typed is lost, unless a new
    // message has been started meanwhile.
    if (!sent) setText((current) => (current === '' ? draft : current));
  };

  let keyboardBehavior: 'padding' | undefined;
  if (Platform.OS === 'ios') {
    keyboardBehavior = 'padding';
  }

  // Inverted so the newest message sits at the bottom and the list starts there.
  const newestFirst = [...messages].reverse();

  let footer = null;
  if (header) {
    footer = <View style={{ marginBottom: spacing.lg }}>{header}</View>;
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === 'me';
    // In the inverted list the previous message in time is at index + 1.
    const older = newestFirst[index + 1];
    const sameSenderAsOlder = older?.senderId === item.senderId;
    const showName = Boolean(showSenderNames) && !mine && !sameSenderAsOlder;
    // Messages in a row from the same person sit close together; a new sender gets more room.
    let marginTop: number = spacing.md;
    if (sameSenderAsOlder) {
      marginTop = spacing.xs;
    }

    let senderLabel = item.senderName;
    let onLongPress: (() => void) | undefined;
    let rowAlign: 'flex-start' | 'flex-end' = 'flex-start';
    let bubbleColor = colors.surface;
    let bubbleBorderColor = colors.border;
    let bottomRightRadius: number = radius.lg;
    let bottomLeftRadius: number = radius.xs;
    let textColor = colors.textPrimary;

    if (mine) {
      senderLabel = 'You';
      rowAlign = 'flex-end';
      bubbleColor = colors.green;
      bubbleBorderColor = colors.green;
      bottomRightRadius = radius.xs;
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
        style={[styles.row, { justifyContent: rowAlign, marginTop }]}>
        <View style={{ maxWidth: '80%', gap: spacing.xs }}>
          {showName && (
            <AppText variant="caption" color="textSecondary" style={{ marginLeft: spacing.md }}>
              {item.senderName}
            </AppText>
          )}
          <View
            style={[
              styles.bubble,
              {
                paddingHorizontal: spacing.md + spacing.xxs,
                paddingVertical: spacing.sm + spacing.xxs,
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

  const canSend = hasVisibleText(text);
  let sendBackground = colors.surfaceMuted;
  let sendIconColor = colors.textSecondary;
  if (canSend) {
    sendBackground = colors.green;
    sendIconColor = colors.onGreen;
  }

  let composerContent;
  if (disabled) {
    composerContent = (
      <AppText color="textSecondary" align="center" style={{ flex: 1, paddingVertical: spacing.md, minHeight: layout.touchTarget }}>
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
              borderRadius: layout.touchTarget / 2,
              minHeight: layout.touchTarget,
              paddingHorizontal: spacing.lg,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => void send()}
          style={[
            styles.send,
            {
              width: layout.touchTarget,
              height: layout.touchTarget,
              borderRadius: layout.touchTarget / 2,
              backgroundColor: sendBackground,
            },
          ]}>
          <Ionicons name="arrow-up" size={size.iconLarge} color={sendIconColor} />
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
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}
        ListFooterComponent={footer}
        renderItem={renderMessage}
      />

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingHorizontal: spacing.md,
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
  bubble: { borderWidth: StyleSheet.hairlineWidth },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, paddingTop: 11, paddingBottom: 11, borderWidth: 1 },
  send: { alignItems: 'center', justifyContent: 'center' },
});
