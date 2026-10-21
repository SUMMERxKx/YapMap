// A centred icon, title and explanation for empty lists, results and "nothing here" moments,
// with an optional action under it.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  tone?: 'neutral' | 'green';
  title: string;
  body?: string;
  size?: 'regular' | 'small'; // small sits inside a list, regular fills a screen
  children?: ReactNode; // e.g. a button
};

export function EmptyState({ icon, tone = 'neutral', title, body, size = 'regular', children }: Props) {
  const { colors, layout, spacing, size: sizes } = useTheme();

  let circleColor = colors.surfaceMuted;
  let iconColor = colors.textSecondary;
  if (tone === 'green') {
    circleColor = colors.greenSoft;
    iconColor = colors.greenText;
  }

  // A regular empty state fills the screen and centres itself; a small one takes only its own height.
  let titleVariant: 'title' | 'heading' = 'title';
  let flex: number | undefined = 1;
  if (size === 'small') {
    titleVariant = 'heading';
    flex = undefined;
  }

  return (
    <View style={[styles.wrap, { flex, gap: spacing.md, paddingVertical: spacing.huge }]}>
      <View
        style={[styles.circle, { backgroundColor: circleColor, marginBottom: spacing.xs }]}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <Ionicons name={icon} size={sizes.iconHero} color={iconColor} />
      </View>
      <AppText variant={titleVariant} align="center" accessibilityRole="header">
        {title}
      </AppText>
      {Boolean(body) && (
        <AppText color="textSecondary" align="center" style={{ maxWidth: layout.maxTextWidth }}>
          {body}
        </AppText>
      )}
      {Boolean(children) && <View style={[styles.action, { marginTop: spacing.sm, gap: spacing.sm }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  circle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  action: { alignSelf: 'stretch' },
});
