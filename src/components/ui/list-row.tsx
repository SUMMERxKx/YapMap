// Settings-style rows and the card that groups them.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type Props = {
  label: string;
  onPress: () => void;
  trailing?: 'chevron' | 'external';
  detail?: string;
  last?: boolean;
};

export function ListRow({ label, onPress, trailing = 'chevron', detail, last }: Props) {
  const { colors, layout, size, spacing } = useTheme();
  // A row inside a group only darkens; shrinking it would pull it away from its neighbours.
  const press = usePressFeedback(colors.surface, colors.surfaceMuted, 1);

  // An external row opens a web page, so it is announced as a link with an "open" icon.
  let role: 'link' | 'button' = 'button';
  let trailingIcon: 'open-outline' | 'chevron-forward' = 'chevron-forward';
  if (trailing === 'external') {
    role = 'link';
    trailingIcon = 'open-outline';
  }

  let accessibilityLabel = label;
  if (detail) {
    accessibilityLabel = `${label}, ${detail}`;
  }

  // The last row in a group has no divider under it.
  let borderBottomWidth = StyleSheet.hairlineWidth;
  if (last) {
    borderBottomWidth = 0;
  }

  return (
    <AnimatedPressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.row,
        {
          minHeight: layout.controlHeight + spacing.xs,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          borderBottomWidth,
          borderBottomColor: colors.border,
        },
        press.style,
      ]}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {Boolean(detail) && <AppText color="textSecondary">{detail}</AppText>}
      <Ionicons name={trailingIcon} size={size.iconMedium} color={colors.textSecondary} />
    </AnimatedPressable>
  );
}

export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
