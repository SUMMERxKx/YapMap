import { Pressable, StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from './app-text';
import { Avatar } from './avatar';
import { Badge } from './badge';

type Props = { person: NearbyPerson; onPress: () => void };

export function PersonCard({ person, onPress }: Props) {
  const { colors, radius, spacing, elevation } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.firstName}. ${person.intro}`}
      accessibilityHint="Opens their profile so you can say hi"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        elevation.card,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.md,
        },
      ]}>
      <Avatar name={person.firstName} photoUri={person.photoUri} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
            {person.firstName}
          </AppText>
          <Badge label="here now" />
        </View>
        <AppText variant="body" color="textSecondary" numberOfLines={3}>
          {person.intro}
        </AppText>
      </View>
    </Pressable>
  );
}

export function PersonCardSkeleton() {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.card, { borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }]}>
      <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.surfaceMuted }} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <View style={{ width: '40%', height: 14, borderRadius: 7, backgroundColor: colors.surfaceMuted }} />
        <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.surfaceMuted }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
