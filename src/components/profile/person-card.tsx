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
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';

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
      <Avatar name={person.firstName} photoUri={person.photoUri} thumbUri={person.thumbUri} size={size.avatarLarge} />
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

/** A grey stand-in the shape of a PersonCard, shown while the Nearby list first loads. */
export function PersonCardSkeleton() {
  const { radius, spacing, size } = useTheme();
  const avatar = size.avatarLarge;
  return (
    <Card raised style={{ ...styles.row, gap: spacing.md }}>
      <Skeleton style={{ ...styles.row, flex: 1, gap: spacing.md }}>
        <SkeletonBlock width={avatar} height={avatar} radius={avatar * 0.28} />
        <View style={{ flex: 1, gap: spacing.sm, paddingTop: spacing.xs }}>
          <SkeletonBlock width="45%" height={16} />
          <SkeletonBlock width="90%" height={12} />
          <SkeletonBlock width="70%" height={12} />
          {/* Widths in % so the chip shapes always fit, even on the narrowest phones. */}
          <View style={[styles.row, { gap: spacing.xs + spacing.xxs, marginTop: spacing.xs }]}>
            <SkeletonBlock width="30%" height={28} radius={radius.pill} />
            <SkeletonBlock width="24%" height={28} radius={radius.pill} />
            <SkeletonBlock width="34%" height={28} radius={radius.pill} />
          </View>
        </View>
      </Skeleton>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flexShrink: 1 },
});
