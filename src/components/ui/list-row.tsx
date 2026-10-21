// Settings-style rows and the card that groups them.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  label: string;
  onPress: () => void;
  trailing?: 'chevron' | 'external';
  detail?: string;
  last?: boolean;
};

export function ListRow({ label, onPress, trailing = 'chevron', detail, last }: Props) {
  const { colors, layout, size, spacing } = useTheme();

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

  const rowStyle = ({ pressed }: { pressed: boolean }) => {
    let backgroundColor = 'transparent';
    if (pressed) {
      backgroundColor = colors.surfaceMuted;
    }
    return [
      styles.row,
      {
        minHeight: layout.controlHeight,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        backgroundColor,
        borderBottomWidth,
        borderBottomColor: colors.border,
      },
    ];
  };

  return (
    <Pressable accessibilityRole={role} accessibilityLabel={accessibilityLabel} onPress={onPress} style={rowStyle}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {Boolean(detail) && <AppText color="textSecondary">{detail}</AppText>}
      <Ionicons name={trailingIcon} size={size.iconMedium} color={colors.textSecondary} />
    </Pressable>
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
