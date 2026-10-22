import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { displayName } from '@/lib/format-person';
import { useStore } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { AnimatedPressable, useGuardedPress, usePressFeedback } from '@/components/ui/press-feedback';

/** Shown on Go live and Nearby while a 1:1 chat is open, so leaving the chat never loses it. */
export function ActiveChatBar() {
  const chat = useStore((state) => state.chat);
  const { colors, motion, radius, size, spacing, elevation } = useTheme();
  const press = usePressFeedback(colors.greenSoft, colors.greenSoft, motion.cardPressScale);
  const openChat = useGuardedPress(() => router.push('/chat'));
  if (!chat) return null;

  let text = `Yapping with ${displayName(chat.other)}`;
  if (chat.status === 'other-cancelled') {
    text = `${displayName(chat.other)} ended the chat`;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${text}. Open the chat`}
      onPress={openChat.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.bar,
        elevation.card,
        press.style,
        {
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        },
      ]}>
      <Avatar
        name={chat.other.firstName}
        photoUri={chat.other.photoUri}
        thumbUri={chat.other.thumbUri}
        size={size.avatarSmall}
      />
      <AppText variant="bodyStrong" color="greenText" style={styles.flex} numberOfLines={1}>
        {text}
      </AppText>
      <AppText variant="caption" color="greenText">
        Open
      </AppText>
      <Ionicons name="chevron-forward" size={size.iconMedium} color={colors.greenText} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center' },
});
