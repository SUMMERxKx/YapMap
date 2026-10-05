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
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole={trailing === 'external' ? 'link' : 'button'}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {detail ? <AppText color="textSecondary">{detail}</AppText> : null}
      <Ionicons
        name={trailing === 'external' ? 'open-outline' : 'chevron-forward'}
        size={18}
        color={colors.textSecondary}
      />
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
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
