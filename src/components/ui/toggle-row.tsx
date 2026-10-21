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

  let opacity = 1;
  if (disabled) {
    opacity = 0.5;
  }

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
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity,
        },
      ]}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {Boolean(description) && (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        )}
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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderWidth: 1 },
});
