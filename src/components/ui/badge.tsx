// Small green pill label with a live dot, e.g. "here now".

import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = { label: string };

export function Badge({ label }: Props) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.greenSoft,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          gap: spacing.xs + spacing.xxs,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: colors.greenText }]} />
      <AppText variant="caption" color="greenText" style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontWeight: '600' },
});
