// The 30 / 60 / 120 minute choice on the go-live sheet.

import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { DURATIONS } from '@/data/constants';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type Duration = (typeof DURATIONS)[number];
type Props = { value: Duration; onChange: (value: Duration) => void };

const DEFAULT_DURATION = 60;

export function DurationChips({ value, onChange }: Props) {
  const { spacing } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Duration" style={[styles.row, { gap: spacing.sm }]}>
      {DURATIONS.map((minutes) => (
        <DurationChip
          key={minutes}
          minutes={minutes}
          selected={minutes === value}
          isDefault={minutes === DEFAULT_DURATION}
          onPress={() => onChange(minutes)}
        />
      ))}
    </View>
  );
}

type ChipProps = { minutes: Duration; selected: boolean; isDefault: boolean; onPress: () => void };

function DurationChip({ minutes, selected, isDefault, onPress }: ChipProps) {
  const { colors, radius } = useTheme();

  let accessibilityLabel = `${minutes} minutes`;
  if (isDefault) {
    accessibilityLabel = `${minutes} minutes, default`;
  }

  let chipColor = colors.surface;
  let pressedColor = colors.surfaceMuted;
  let chipBorderColor = colors.inputBorder;
  let labelColor = colors.textPrimary;
  let captionColor = colors.textSecondary;
  if (selected) {
    chipColor = colors.green;
    pressedColor = colors.greenPressed;
    chipBorderColor = colors.green;
    labelColor = colors.onGreen;
    captionColor = colors.onGreen;
  }
  const press = usePressFeedback(chipColor, pressedColor);

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.chip, { borderRadius: radius.md, borderColor: chipBorderColor }, press.style]}>
      <AppText variant="bodyStrong" style={{ color: labelColor }}>
        {minutes} min
      </AppText>
      {isDefault && (
        <AppText variant="caption" style={{ color: captionColor }}>
          default
        </AppText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 8,
  },
});
