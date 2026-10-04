import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = Omit<TextInputProps, 'style'> & {
  ref?: Ref<TextInput>;
  label: string;
  required?: boolean;
  error?: string | null;
  showCounter?: boolean;
};

export function TextField({ label, required, error, showCounter, maxLength, value, ...rest }: Props) {
  const { colors, radius, spacing, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.destructive : focused ? colors.green : colors.inputBorder;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.labelRow}>
        <AppText variant="caption" color="textPrimary">
          {label}
          {required ? <AppText variant="caption" color="destructive"> *</AppText> : null}
        </AppText>
        {showCounter && maxLength ? (
          <AppText variant="caption" color="textSecondary" accessibilityLabel={`${value?.length ?? 0} of ${maxLength} characters`}>
            {value?.length ?? 0}/{maxLength}
          </AppText>
        ) : null}
      </View>
      <TextInput
        {...rest}
        value={value}
        maxLength={maxLength}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          type.body,
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            borderRadius: radius.md,
            minHeight: rest.multiline ? 88 : 52,
            textAlignVertical: rest.multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <AppText variant="caption" color="destructive" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { paddingHorizontal: 14, paddingVertical: 12 },
});
