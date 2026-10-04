import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';
import { Button, IconButton } from './button';
import { Screen } from './screen';

type Props = {
  step: number; // 1-based
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  nextLabel?: string;
  canContinue: boolean;
  onNext: () => void;
  loading?: boolean;
};

/** One question per screen: progress, back, a big title, the question, and Next. */
export function SetupStep({ step, total, title, subtitle, children, nextLabel = 'Next', canContinue, onNext, loading }: Props) {
  const { colors, radius, spacing } = useTheme();
  const progress = step / total;

  return (
    <Screen
      scroll
      footer={<Button label={nextLabel} onPress={onNext} disabled={!canContinue} loading={loading} />}>
      <View style={styles.topRow}>
        <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${total}`}
          accessibilityValue={{ min: 0, max: total, now: step }}
          style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.green, borderRadius: radius.pill }]} />
        </View>
        <AppText variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
          {step}/{total}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
      </View>

      <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
