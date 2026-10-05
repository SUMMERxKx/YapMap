// A labelled checkbox card (used for the 18+ confirmation and "also block").

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  children?: ReactNode; // extra text under the label
  tone?: 'default' | 'danger';
};

export function Checkbox({ checked, onChange, label, children, tone = 'default' }: Props) {
  const { colors, radius, spacing } = useTheme();
  const accent = tone === 'danger' ? colors.destructive : colors.green;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={[
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: checked ? accent : colors.border,
          backgroundColor: colors.surface,
        },
      ]}>
      <View
        style={[
          styles.box,
          { borderColor: checked ? accent : colors.inputBorder, backgroundColor: checked ? accent : 'transparent' },
        ]}>
        {checked ? (
          <Ionicons name="checkmark" size={18} color={tone === 'danger' ? colors.onDestructive : colors.onGreen} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" color={tone === 'danger' ? 'destructive' : 'textPrimary'}>
          {label}
        </AppText>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
