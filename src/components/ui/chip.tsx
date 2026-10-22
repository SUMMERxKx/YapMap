// Pill-shaped chips: tappable ones for picking (interests, durations), read-only ones for showing.

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { AnimatedPressable, usePressFeedback } from '@/components/ui/press-feedback';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void; // omit for a read-only chip
  disabled?: boolean;
  role?: 'checkbox' | 'radio';
};

// Two components underneath, because only the tappable one needs the press animation hooks.
export function Chip(props: ChipProps) {
  if (!props.onPress) {
    return <ReadOnlyChip label={props.label} />;
  }
  return <ChoiceChip {...props} onPress={props.onPress} />;
}

function ReadOnlyChip({ label }: { label: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        styles.readOnly,
        { paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
      ]}>
      <AppText variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

function ChoiceChip({ label, selected, onPress, disabled, role = 'checkbox' }: ChipProps & { onPress: () => void }) {
  const { colors, layout, radius, spacing } = useTheme();
  const isSelected = Boolean(selected);

  // Unselected chips are light outlined pills; a chosen one fills green with a tick.
  let backgroundColor = colors.surface;
  let pressedColor = colors.surfaceMuted;
  let borderColor = colors.inputBorder;
  let textColor = colors.textPrimary;
  if (isSelected) {
    backgroundColor = colors.green;
    pressedColor = colors.greenPressed;
    borderColor = colors.green;
    textColor = colors.onGreen;
  }
  const press = usePressFeedback(backgroundColor, pressedColor);

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

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole={role}
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.chip,
        {
          minHeight: layout.touchTarget,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.pill,
          borderColor,
          opacity,
        },
        press.style,
      ]}>
      {isSelected && <Ionicons name="checkmark" size={16} color={colors.onGreen} />}
      <AppText variant="caption" style={{ color: textColor, fontWeight: '600' }}>
        {label}
      </AppText>
    </AnimatedPressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
  },
  readOnly: { minHeight: 28, borderWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
