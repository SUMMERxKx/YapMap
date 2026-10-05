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
  const body = (
    <>
      {selected ? <Ionicons name="checkmark" size={16} color={colors.onGreen} /> : null}
      <AppText variant="caption" style={{ color: selected ? colors.onGreen : colors.textPrimary, fontWeight: '600' }}>
        {label}
      </AppText>
    </>
  );
  const look = [
    styles.chip,
    {
      borderRadius: radius.pill,
      backgroundColor: selected ? colors.green : colors.surface,
      borderColor: selected ? colors.green : colors.inputBorder,
      opacity: disabled ? 0.45 : 1,
    },
  ];

  if (!onPress) {
    return (
      <View style={[styles.chip, styles.readOnly, { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }]}>
        <AppText variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected: !!selected, disabled } : { checked: !!selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={look}>
      {body}
    </Pressable>
  );
}

/** Read-only row of interest chips, e.g. on a person card. */
export function InterestList({ interests, max }: { interests: string[]; max?: number }) {
  const shown = max ? interests.slice(0, max) : interests;
  const extra = interests.length - shown.length;
  return (
    <View style={styles.wrap} accessibilityLabel={`Interests: ${interests.join(', ')}`} accessible>
      {shown.map((i) => (
        <Chip key={i} label={i} />
      ))}
      {extra > 0 ? <Chip label={`+${extra}`} /> : null}
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
