// The rounded, outlined surface used for profile cards, list items and info boxes.
// Pass onPress to make the whole card tappable (it darkens while pressed).

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityRole, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
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
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  surface = 'surface',
  padding = 'regular',
  raised,
  style,
}: Props) {
  const { colors, elevation, radius, spacing } = useTheme();

  let paddingSize: number = spacing.lg;
  if (padding === 'compact') {
    paddingSize = spacing.md;
  }

  let shadow = null;
  if (raised) {
    shadow = elevation.card;
  }

  const boxStyle = (backgroundColor: string) => [
    styles.card,
    shadow,
    { backgroundColor, borderColor: colors.border, borderRadius: radius.lg, padding: paddingSize },
    style,
  ];

  if (!onPress) {
    return <View style={boxStyle(colors[surface])}>{children}</View>;
  }

  const pressableStyle = ({ pressed }: { pressed: boolean }) => {
    let backgroundColor = colors[surface];
    if (pressed) {
      backgroundColor = colors.surfaceMuted;
    }
    return boxStyle(backgroundColor);
  };

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={pressableStyle}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
