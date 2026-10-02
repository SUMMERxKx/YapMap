import { Pressable, StyleSheet, View } from 'react-native';

import { DURATIONS } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Duration = (typeof DURATIONS)[number];
type Props = { value: Duration; onChange: (value: Duration) => void };

export function DurationChips({ value, onChange }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Duration" style={styles.row}>
      {DURATIONS.map((minutes) => {
        const selected = minutes === value;
        return (
          <Pressable
            key={minutes}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${minutes} minutes${minutes === 60 ? ', default' : ''}`}
            onPress={() => onChange(minutes)}
            style={[
              styles.chip,
              {
                borderRadius: radius.md,
                backgroundColor: selected ? colors.green : colors.surface,
                borderColor: selected ? colors.green : colors.inputBorder,
              },
            ]}>
            <AppText variant="bodyStrong" style={{ color: selected ? colors.onGreen : colors.textPrimary }}>
              {minutes} min
            </AppText>
            {minutes === 60 ? (
              <AppText variant="caption" style={{ color: selected ? colors.onGreen : colors.textSecondary }}>
                default
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 8,
  },
});
