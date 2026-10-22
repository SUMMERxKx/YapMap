// One choice in a list of single-choice options (gender, report reason): a full-width row
// with the label and a radio circle. `danger` tints the chosen row red instead of green.

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'green' | 'danger';
};

export function RadioOption({ label, selected, onPress, tone = 'green' }: Props) {
  const { colors, layout, radius, spacing, size } = useTheme();

  let backgroundColor = colors.surface;
  let pressedColor = colors.surfaceMuted;
  let borderColor = colors.border;
  let borderWidth = 1;
  let labelColor: 'textPrimary' | 'greenText' | 'destructive' = 'textPrimary';
  let radioIcon: 'radio-button-on' | 'radio-button-off' = 'radio-button-off';
  let radioColor = colors.inputBorder;
  if (selected && tone === 'danger') {
    backgroundColor = colors.destructiveSoft;
    pressedColor = colors.destructiveSoft;
    borderColor = colors.destructive;
    labelColor = 'destructive';
  } else if (selected) {
    backgroundColor = colors.greenSoft;
    pressedColor = colors.greenSoft;
    borderColor = colors.green;
    labelColor = 'greenText';
  }
  if (selected) {
    borderWidth = 2;
    radioIcon = 'radio-button-on';
    radioColor = colors[labelColor];
  }

  // The border grows when chosen; trimming the padding by the same amount keeps the text still.
  const paddingHorizontal = spacing.lg - (borderWidth - 1);
  const press = usePressFeedback(backgroundColor, pressedColor);

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={handlePress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.option,
        {
          minHeight: layout.controlHeight,
          paddingHorizontal,
          gap: spacing.md,
          borderRadius: radius.md,
          borderColor,
          borderWidth,
        },
        press.style,
      ]}>
      <AppText variant="bodyStrong" color={labelColor} style={styles.label}>
        {label}
      </AppText>
      <Ionicons name={radioIcon} size={size.iconLarge} color={radioColor} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
