// A screen's big title with an optional line of explanation under it.

import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  title: string;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
};

export function ScreenHeader({ title, subtitle, align = 'left' }: Props) {
  const { spacing } = useTheme();
  let alignItems: 'flex-start' | 'center' = 'flex-start';
  if (align === 'center') {
    alignItems = 'center';
  }

  return (
    // The extra bottom margin separates the header from the screen's first block.
    <View style={{ gap: spacing.sm, alignItems, marginBottom: spacing.sm }}>
      <AppText variant="title" accessibilityRole="header" align={align}>
        {title}
      </AppText>
      {Boolean(subtitle) && (
        <AppText color="textSecondary" align={align}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}
