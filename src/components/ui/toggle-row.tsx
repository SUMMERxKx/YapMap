import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A labelled on/off switch. The whole row is tappable. */
export function ToggleRow({ label, description, value, onChange, disabled }: Props) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.green, false: colors.inputBorder }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.inputBorder}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderWidth: StyleSheet.hairlineWidth },
});
