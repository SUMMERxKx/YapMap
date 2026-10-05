// Buttons: one pill Button with variants, and a round IconButton for icon-only actions.

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'destructive' | 'destructiveSoft';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  haptic,
  style,
  accessibilityHint,
}: Props) {
  const { colors, radius } = useTheme();

  const look = {
    primary: { bg: colors.green, pressed: colors.greenPressed, fg: colors.onGreen, border: undefined },
    secondary: { bg: colors.surfaceMuted, pressed: colors.border, fg: colors.textPrimary, border: colors.border },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.textPrimary, border: undefined },
    // Black in light mode, white in dark mode: Apple's sign-in button guidelines.
    inverse: { bg: colors.textPrimary, pressed: colors.textSecondary, fg: colors.background, border: undefined },
    destructive: {
      bg: colors.destructive,
      pressed: colors.destructivePressed,
      fg: colors.onDestructive,
      border: undefined,
    },
    destructiveSoft: {
      bg: colors.destructiveSoft,
      pressed: colors.border,
      fg: colors.destructive,
      border: undefined,
    },
  }[variant];

  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      android_ripple={{ color: look.pressed }}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius.pill,
          backgroundColor: pressed ? look.pressed : look.bg,
          borderColor: look.border,
          borderWidth: look.border ? StyleSheet.hairlineWidth : 0,
          opacity: inactive && !loading ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={20} color={look.fg} /> : null}
          <AppText variant="button" style={{ color: look.fg }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string; // required: icon-only buttons need a screen-reader label
  onPress: () => void;
};

export function IconButton({ icon, label, onPress }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: pressed ? colors.border : colors.surfaceMuted },
      ]}>
      <Ionicons name={icon} size={22} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
