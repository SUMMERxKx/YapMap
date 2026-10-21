// The bar at the top of a chat: back, who or what the chat is with, and actions on the right.
// Shared by the 1:1 chat and event group chats so both line up the same way.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { IconButton } from '@/components/ui/button';

type Props = {
  onBack: () => void;
  children: ReactNode; // the title area
  trailing?: ReactNode; // e.g. the safety menu and an End or Leave button
};

export function ChatHeader({ onBack, children, trailing }: Props) {
  const { colors, layout, spacing } = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          minHeight: layout.topBarHeight + spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}>
      <IconButton icon="chevron-back" label="Back" onPress={onBack} />
      <View style={styles.title}>{children}</View>
      {Boolean(trailing) && <View style={[styles.trailing, { gap: spacing.sm }]}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: 'row', alignItems: 'center' },
});
