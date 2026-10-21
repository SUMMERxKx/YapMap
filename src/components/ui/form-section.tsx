// A labelled group in a form: the label (with a red * when required), an optional count
// on the right, an optional hint under the label, then the controls.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  count?: string; // e.g. "2/5"
  countLabel?: string; // what a screen reader says for the count
  children: ReactNode;
};

export function FormSection({ label, required, hint, count, countLabel, children }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: spacing.xxs }}>
        <View style={styles.labelRow}>
          <FieldLabel label={label} required={required} />
          {Boolean(count) && (
            <AppText variant="caption" color="textSecondary" accessibilityLabel={countLabel} style={styles.count}>
              {count}
            </AppText>
          )}
        </View>
        {Boolean(hint) && (
          <AppText variant="caption" color="textSecondary">
            {hint}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

/** The label above a form control, shared with TextField so every label looks the same. */
export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <AppText variant="fieldLabel" style={styles.label}>
      {label}
      {required && (
        <AppText variant="fieldLabel" color="destructive">
          {' *'}
        </AppText>
      )}
    </AppText>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flexShrink: 1 },
  count: { fontVariant: ['tabular-nums'] },
});
