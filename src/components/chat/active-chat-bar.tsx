import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { displayName } from '@/data/types';
import { useStore } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';

/** Shown on Go live and Nearby while a 1:1 chat is open, so leaving the chat never loses it. */
export function ActiveChatBar() {
  const chat = useStore((s) => s.chat);
  const { colors, radius, spacing, elevation } = useTheme();
  if (!chat) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Yapping with ${displayName(chat.other)}. Open the chat`}
      onPress={() => router.push('/chat')}
      style={[
        styles.bar,
        elevation.card,
        { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
      ]}>
      <Avatar name={chat.other.firstName} photoUri={chat.other.photoUri} size={40} />
      <AppText variant="bodyStrong" color="greenText" style={styles.flex} numberOfLines={1}>
        Yapping with {displayName(chat.other)}
      </AppText>
      <AppText variant="caption" color="greenText">
        Open
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.greenText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center' },
});
