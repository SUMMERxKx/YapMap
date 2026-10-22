// A centred picture, title and explanation for empty lists, results and "nothing here" moments,
// with an optional action under it. The picture is the Yap cat (`mascot`) or an icon in a circle.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Mascot, type MascotPose } from '@/components/mascot/mascot';

type Props = {
  mascot?: MascotPose; // the cat, for the app's big moments; otherwise pass an icon
  icon?: ComponentProps<typeof Ionicons>['name'];
  tone?: 'neutral' | 'green'; // the icon circle's colour
  title: string;
  body?: string;
  size?: 'regular' | 'small'; // small sits inside a list, regular fills a screen
  children?: ReactNode; // e.g. a button
};

export function EmptyState({ mascot, icon, tone = 'neutral', title, body, size = 'regular', children }: Props) {
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
  let mascotSize = 176;
  if (size === 'small') {
    titleVariant = 'heading';
    flex = undefined;
    mascotSize = 136;
  }

  // The cat already says "nothing here" on its own, so the title beside it carries the meaning.
  let picture = null;
  if (mascot) {
    picture = <Mascot pose={mascot} size={mascotSize} />;
  } else if (icon) {
    picture = (
      <View
        style={[styles.circle, { backgroundColor: circleColor, marginBottom: spacing.xs }]}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <Ionicons name={icon} size={sizes.iconHero} color={iconColor} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { flex, gap: spacing.md, paddingVertical: spacing.huge }]}>
      {picture}
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
