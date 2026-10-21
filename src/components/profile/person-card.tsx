// A person in the Nearby list: photo, name, note, intro and interests. Never a location.

import { StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { displayName } from '@/lib/format-person';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InterestList } from '@/components/ui/chip';

type Props = { person: NearbyPerson; onPress: () => void };

export function PersonCard({ person, onPress }: Props) {
  const { spacing, size } = useTheme();
  const interestsText = person.interests.join(', ');
  const accessibilityLabel = `${displayName(person)}. ${person.intro}. Interests: ${interestsText}`;

  return (
    <Card
      raised
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens their profile so you can say hi"
      style={{ ...styles.row, gap: spacing.md }}>
      <Avatar name={person.firstName} photoUri={person.photoUri} size={size.avatarLarge} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={[styles.titleRow, { gap: spacing.sm }]}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {displayName(person)}
          </AppText>
          <Badge label="here now" />
        </View>
        {person.note !== '' && (
          <AppText variant="bodyStrong" color="greenText" numberOfLines={1}>
            {`"${person.note}"`}
          </AppText>
        )}
        <AppText variant="body" color="textSecondary" numberOfLines={2}>
          {person.intro}
        </AppText>
        <View style={{ marginTop: spacing.xs }}>
          <InterestList interests={person.interests} max={3} />
        </View>
      </View>
    </Card>
  );
}

export function PersonCardSkeleton() {
  const { colors, radius, spacing, size } = useTheme();
  const avatar = size.avatarLarge;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Card style={{ ...styles.row, gap: spacing.md }}>
        <View style={{ width: avatar, height: avatar, borderRadius: avatar * 0.28, backgroundColor: colors.surfaceMuted }} />
        <View style={{ flex: 1, gap: spacing.sm, paddingTop: spacing.xs }}>
          <View style={{ width: '40%', height: 14, borderRadius: radius.xs, backgroundColor: colors.surfaceMuted }} />
          <View style={{ width: '85%', height: 12, borderRadius: radius.xs, backgroundColor: colors.surfaceMuted }} />
          <View style={{ width: '65%', height: 12, borderRadius: radius.xs, backgroundColor: colors.surfaceMuted }} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flexShrink: 1 },
});
