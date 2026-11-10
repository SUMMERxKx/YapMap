// Labelled text input with focus/error borders, an optional character counter and an
// optional accessory inside the input on the right (e.g. a show/hide password button).

import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { FieldLabel } from '@/components/ui/form-section';

type Props = Omit<TextInputProps, 'style'> & {
  ref?: Ref<TextInputInstance>;
  label: string;
  required?: boolean;
  error?: string | null;
  showCounter?: boolean;
  accessory?: ReactNode;
};

export function TextField({ label, required, error, showCounter, accessory, maxLength, value, ...rest }: Props) {
  const { colors, layout, radius, spacing, type } = useTheme();
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
  let minHeight: number = layout.controlHeight;
  let textAlignVertical: 'top' | 'center' = 'center';
  if (rest.multiline) {
    minHeight = 104;
    textAlignVertical = 'top';
  }

  // Leave room on the right so typed text never runs under the accessory.
  let paddingRight: number = spacing.lg;
  if (accessory) {
    paddingRight = layout.touchTarget + spacing.sm;
  }

  const length = value?.length ?? 0;
  const showCounterText = Boolean(showCounter) && Boolean(maxLength);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.labelRow}>
        <FieldLabel label={label} required={required} />
        {showCounterText && (
          <AppText
            variant="caption"
            color="textSecondary"
            accessibilityLabel={`${length} of ${maxLength} characters`}
            style={styles.counter}>
            {length}/{maxLength}
          </AppText>
        )}
      </View>
      <View>
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
              paddingLeft: spacing.lg,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderColor,
              borderWidth,
              borderRadius: radius.md,
              minHeight,
              paddingRight,
              textAlignVertical,
            },
          ]}
        />
        {Boolean(accessory) && <View style={styles.accessory}>{accessory}</View>}
      </View>
      {hasError && (
        <AppText variant="caption" color="destructive" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  counter: { fontVariant: ['tabular-nums'] },
  input: { paddingVertical: 14 },
  accessory: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' },
});
