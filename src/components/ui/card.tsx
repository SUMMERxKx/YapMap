// The rounded surface used for profile cards, list items and info boxes.
// Pass onPress to make the whole card tappable (it sinks a little and darkens while pressed).

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  surface?: 'surface' | 'background'; // `background` stands out on a sheet
  padding?: 'regular' | 'compact';
  raised?: boolean; // a soft shadow, for cards in a list
  style?: ViewStyle;
};

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  surface = 'surface',
  padding = 'regular',
  raised,
  style,
}: Props) {
  const { scheme, colors, elevation, motion, radius, spacing } = useTheme();
  const press = usePressFeedback(colors[surface], colors.surfaceMuted, motion.cardPressScale);

  let paddingSize: number = spacing.lg;
  if (padding === 'compact') {
    paddingSize = spacing.md;
  }

  // A raised card is lifted by its shadow alone in light mode; dark mode has no visible
  // shadows, so it keeps the hairline edge there.
  let shadow = null;
  let borderColor = colors.border;
  if (raised) {
    shadow = elevation.card;
    if (scheme === 'light') {
      borderColor = 'transparent';
    }
  }

  const boxStyle = [
    styles.card,
    shadow,
    { borderColor, borderRadius: radius.lg, padding: paddingSize },
    style,
  ];

  if (!onPress) {
    return <View style={[boxStyle, { backgroundColor: colors[surface] }]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[boxStyle, press.style]}>
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
