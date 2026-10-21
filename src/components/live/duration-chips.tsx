// The 30 / 60 / 120 minute choice on the go-live sheet.

import { Pressable, StyleSheet, View } from 'react-native';

import { DURATIONS } from '@/data/constants';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Duration = (typeof DURATIONS)[number];
type Props = { value: Duration; onChange: (value: Duration) => void };

const DEFAULT_DURATION = 60;

export function DurationChips({ value, onChange }: Props) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Duration" style={[styles.row, { gap: spacing.sm }]}>
      {DURATIONS.map((minutes) => {
        const selected = minutes === value;
        const isDefault = minutes === DEFAULT_DURATION;

        let accessibilityLabel = `${minutes} minutes`;
        if (isDefault) {
          accessibilityLabel = `${minutes} minutes, default`;
        }

        let chipColor = colors.surface;
        let chipBorderColor = colors.inputBorder;
        let labelColor = colors.textPrimary;
        let captionColor = colors.textSecondary;
        if (selected) {
          chipColor = colors.green;
          chipBorderColor = colors.green;
          labelColor = colors.onGreen;
          captionColor = colors.onGreen;
        }

        return (
          <Pressable
            key={minutes}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={accessibilityLabel}
            onPress={() => onChange(minutes)}
            style={[
              styles.chip,
              {
                borderRadius: radius.md,
                backgroundColor: chipColor,
                borderColor: chipBorderColor,
              },
            ]}>
            <AppText variant="bodyStrong" style={{ color: labelColor }}>
              {minutes} min
            </AppText>
            {isDefault && (
              <AppText variant="caption" style={{ color: captionColor }}>
                default
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 8,
  },
});
