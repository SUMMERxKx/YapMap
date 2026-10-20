import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void; // omit for a read-only chip
  disabled?: boolean;
  role?: 'checkbox' | 'radio';
};

export function Chip({ label, selected, onPress, disabled, role = 'checkbox' }: ChipProps) {
  const { colors, radius } = useTheme();

  if (!onPress) {
    return (
      <View style={[styles.chip, styles.readOnly, { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }]}>
        <AppText variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
      </View>
    );
  }

  const isSelected = Boolean(selected);

  let backgroundColor = colors.surface;
  let borderColor = colors.inputBorder;
  let textColor = colors.textPrimary;
  if (isSelected) {
    backgroundColor = colors.green;
    borderColor = colors.green;
    textColor = colors.onGreen;
  }

  let opacity = 1;
  if (disabled) {
    opacity = 0.45;
  }

  // Radio chips report "selected" to screen readers; checkbox chips report "checked".
  let accessibilityState;
  if (role === 'radio') {
    accessibilityState = { selected: isSelected, disabled };
  } else {
    accessibilityState = { checked: isSelected, disabled };
  }

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, { borderRadius: radius.pill, backgroundColor, borderColor, opacity }]}>
      {isSelected && <Ionicons name="checkmark" size={16} color={colors.onGreen} />}
      <AppText variant="caption" style={{ color: textColor, fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Read-only row of interest chips, e.g. on a person card. */
export function InterestList({ interests, max }: { interests: string[]; max?: number }) {
  let shown = interests;
  if (max) {
    shown = interests.slice(0, max);
  }
  const hiddenCount = interests.length - shown.length;

  return (
    <View style={styles.wrap} accessibilityLabel={`Interests: ${interests.join(', ')}`} accessible>
      {shown.map((interest) => (
        <Chip key={interest} label={interest} />
      ))}
      {hiddenCount > 0 && <Chip label={`+${hiddenCount}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  readOnly: { minHeight: 28, paddingHorizontal: 10, borderWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
