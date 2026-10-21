import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';

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
export function SetupStep({
  step,
  total,
  title,
  subtitle,
  children,
  nextLabel = 'Next',
  canContinue,
  onNext,
  loading,
}: Props) {
  const { colors, radius, spacing } = useTheme();
  const progressPercent = (step / total) * 100;

  return (
    <Screen
      scroll
      footer={<Button label={nextLabel} onPress={onNext} disabled={!canContinue} loading={loading} />}>
      <TopBar
        leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />}
        trailing={
          <AppText variant="caption" color="textSecondary" style={styles.count}>
            {step}/{total}
          </AppText>
        }>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${total}`}
          accessibilityValue={{ min: 0, max: total, now: step }}
          style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: colors.green, borderRadius: radius.pill }]} />
        </View>
      </TopBar>

      <View style={{ marginTop: spacing.sm }}>
        <ScreenHeader title={title} subtitle={subtitle} />
      </View>

      <View style={{ gap: spacing.lg }}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 6, overflow: 'hidden' },
  count: { fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right' },
  fill: { height: '100%' },
});
