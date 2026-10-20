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

  // Colours for each variant: background, background while pressed, text/icon, border.
  const looks = {
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
  };
  const look = looks[variant];

  const isLoading = Boolean(loading);
  const inactive = Boolean(disabled) || isLoading;

  let borderWidth = 0;
  if (look.border) {
    borderWidth = StyleSheet.hairlineWidth;
  }

  // A disabled button fades out; a loading one keeps full colour behind its spinner.
  let opacity = 1;
  if (inactive && !isLoading) {
    opacity = 0.5;
  }

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const buttonStyle = ({ pressed }: { pressed: boolean }) => {
    let backgroundColor = look.bg;
    let scale = 1;
    if (pressed) {
      backgroundColor = look.pressed;
      scale = 0.98;
    }
    return [
      styles.base,
      {
        borderRadius: radius.pill,
        backgroundColor,
        borderColor: look.border,
        borderWidth,
        opacity,
        transform: [{ scale }],
      },
      style,
    ];
  };

  let content;
  if (isLoading) {
    content = <ActivityIndicator color={look.fg} />;
  } else {
    content = (
      <View style={styles.row}>
        {icon !== undefined && <Ionicons name={icon} size={20} color={look.fg} />}
        <AppText variant="button" style={{ color: look.fg }}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: isLoading }}
      disabled={inactive}
      onPress={handlePress}
      android_ripple={{ color: look.pressed }}
      style={buttonStyle}>
      {content}
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

  const iconButtonStyle = ({ pressed }: { pressed: boolean }) => {
    let backgroundColor = colors.surfaceMuted;
    if (pressed) {
      backgroundColor = colors.border;
    }
    return [styles.icon, { backgroundColor }];
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={iconButtonStyle}>
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
