// Labelled text input with focus/error borders and an optional character counter.

import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

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
  const hasError = Boolean(error);

  // An error wins over focus, so the red border stays while the user fixes it.
  let borderColor = colors.inputBorder;
  if (hasError) {
    borderColor = colors.destructive;
  } else if (focused) {
    borderColor = colors.green;
  }

  let borderWidth = 1;
  if (focused || hasError) {
    borderWidth = 2;
  }

  // Multiline fields are taller and start typing at the top.
  let minHeight = 52;
  let textAlignVertical: 'top' | 'center' = 'center';
  if (rest.multiline) {
    minHeight = 88;
    textAlignVertical = 'top';
  }

  const length = value?.length ?? 0;
  const showCounterText = Boolean(showCounter) && Boolean(maxLength);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.labelRow}>
        <AppText variant="caption" color="textPrimary">
          {label}
          {required && (
            <AppText variant="caption" color="destructive">
              {' *'}
            </AppText>
          )}
        </AppText>
        {showCounterText && (
          <AppText variant="caption" color="textSecondary" accessibilityLabel={`${length} of ${maxLength} characters`}>
            {length}/{maxLength}
          </AppText>
        )}
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
            borderWidth,
            borderRadius: radius.md,
            minHeight,
            textAlignVertical,
          },
        ]}
      />
      {hasError && (
        <AppText variant="caption" color="destructive" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { paddingHorizontal: 14, paddingVertical: 12 },
});
