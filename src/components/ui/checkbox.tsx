// A labelled checkbox card (used for the 18+ confirmation and "also block").

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  children?: ReactNode; // extra text under the label
  tone?: 'default' | 'danger';
};

export function Checkbox({ checked, onChange, label, children, tone = 'default' }: Props) {
  const { colors, radius, spacing } = useTheme();
  const press = usePressFeedback(colors.surface, colors.surfaceMuted);
  let accent = colors.green;
  let checkColor = colors.onGreen;
  let labelColor: 'textPrimary' | 'destructive' = 'textPrimary';
  if (tone === 'danger') {
    accent = colors.destructive;
    checkColor = colors.onDestructive;
    labelColor = 'destructive';
  }

  let cardBorderColor = colors.border;
  let boxBorderColor = colors.inputBorder;
  let boxColor = 'transparent';
  if (checked) {
    cardBorderColor = accent;
    boxBorderColor = accent;
    boxColor = accent;
  }

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!checked);
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: cardBorderColor,
        },
        press.style,
      ]}>
      <View style={[styles.box, { borderRadius: radius.xs, borderColor: boxBorderColor, backgroundColor: boxColor }]}>
        {checked && <Ionicons name="checkmark" size={18} color={checkColor} />}
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="bodyStrong" color={labelColor}>
          {label}
        </AppText>
        {children}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
