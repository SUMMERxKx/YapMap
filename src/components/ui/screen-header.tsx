// A screen's big title with an optional line of explanation under it.

import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  title: string;
  subtitle?: ReactNode;
};

export function ScreenHeader({ title, subtitle }: Props) {
  const { spacing } = useTheme();

  return (
    // The extra bottom margin separates the header from the screen's first block.
    <View style={{ gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {Boolean(subtitle) && (
        <AppText color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
  );
}
