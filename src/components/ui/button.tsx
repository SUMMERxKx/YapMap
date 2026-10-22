// Buttons: one pill Button with variants and two sizes, and a round IconButton for icon-only actions.

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

// `link` is a text-only action (e.g. "Forgot password?") that lines up with the text around it.
type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'inverse' | 'destructive' | 'destructiveSoft';

// `compact` is the smaller button that sits inside a header or a row.
type Size = 'regular' | 'compact';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
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
  size = 'regular',
  icon,
  loading,
  disabled,
  haptic,
  style,
  accessibilityHint,
}: Props) {
  const { colors, layout, radius, spacing, size: sizes } = useTheme();

  // Colours for each variant: background, background while pressed, text/icon, border.
  const looks = {
    primary: { bg: colors.green, pressed: colors.greenPressed, fg: colors.onGreen, border: undefined },
    secondary: { bg: colors.surfaceMuted, pressed: colors.border, fg: colors.textPrimary, border: colors.border },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.textPrimary, border: undefined },
    link: { bg: 'transparent', pressed: 'transparent', fg: colors.greenText, border: undefined },
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
  const press = usePressFeedback(look.bg, look.pressed);

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

  // Regular buttons are full height; compact ones fit in a header row; links have no padding
  // so their text lines up with the text around them.
  let minHeight: number = layout.controlHeight;
  let paddingHorizontal: number = spacing.xl;
  let labelVariant: 'button' | 'bodyStrong' | 'fieldLabel' = 'button';
  if (size === 'compact') {
    minHeight = layout.touchTarget;
    paddingHorizontal = spacing.lg;
    labelVariant = 'fieldLabel';
  }
  if (variant === 'link') {
    minHeight = layout.touchTarget;
    paddingHorizontal = 0;
    labelVariant = 'bodyStrong';
  }

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const buttonStyle = [
    styles.base,
    {
      minHeight,
      paddingHorizontal,
      borderRadius: radius.pill,
      borderColor: look.border,
      borderWidth,
      opacity,
    },
    press.style,
    style,
  ];

  let content;
  if (isLoading) {
    content = <ActivityIndicator color={look.fg} />;
  } else {
    content = (
      <View style={styles.row}>
        {icon !== undefined && <Ionicons name={icon} size={sizes.iconMedium} color={look.fg} />}
        <AppText variant={labelVariant} align="center" style={[styles.label, { color: look.fg }]}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: isLoading }}
      disabled={inactive}
      onPress={handlePress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={buttonStyle}>
      {content}
    </AnimatedPressable>
  );
}

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string; // required: icon-only buttons need a screen-reader label
  onPress: () => void;
};

export function IconButton({ icon, label, onPress }: IconButtonProps) {
  const { colors, layout, size } = useTheme();
  const press = usePressFeedback(colors.surfaceMuted, colors.border);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={4}
      style={[
        styles.icon,
        { width: layout.touchTarget, height: layout.touchTarget, borderRadius: layout.touchTarget / 2 },
        press.style,
      ]}>
      <Ionicons name={icon} size={size.iconLarge} color={colors.textPrimary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1 },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
