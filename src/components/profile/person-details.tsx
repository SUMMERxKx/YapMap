import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { usePersonPhotos } from '@/hooks/use-person-photos';
import { displayName, genderLabel } from '@/lib/format-person';
import { photoSource } from '@/lib/photo-source';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Card } from '@/components/ui/card';
import { InterestList } from '@/components/ui/chip';
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';

type Props = { person: NearbyPerson; subtitle?: string };

/** The full profile another person sees: photo, name, gender, intro and interests. */
export function PersonDetails({ person, subtitle }: Props) {
  const { colors, layout, radius, size, spacing } = useTheme();
  const gender = genderLabel(person.gender);
  const photos = usePersonPhotos(person);

  return (
    <View style={{ gap: layout.sectionGap }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Avatar name={person.firstName} photoUri={person.photoUri} size={size.avatarHero} />
        <AppText variant="title" accessibilityRole="header" align="center" style={{ marginTop: spacing.md }}>
          {displayName(person)}
        </AppText>
        {gender !== null && <AppText color="textSecondary">{gender}</AppText>}
        {person.note !== '' && (
          <AppText variant="bodyStrong" color="greenText" align="center" style={{ marginTop: spacing.xs }}>
            {`"${person.note}"`}
          </AppText>
        )}
        {Boolean(subtitle) && (
          <AppText color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {subtitle}
          </AppText>
        )}
      </View>

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          accessibilityLabel={`${photos.length} photos of ${person.firstName}`}>
          {photos.map((uri, index) => (
            <Image
              key={uri}
              source={photoSource(uri)}
              accessibilityLabel={`Photo ${index + 1} of ${person.firstName}`}
              style={[styles.photo, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }]}
              contentFit="cover"
              transition={150}
            />
          ))}
        </ScrollView>
      )}

      <Card surface="background" style={{ gap: spacing.sm }}>
        <AppText variant="label" color="textSecondary">
          INTRO
        </AppText>
        <AppText>{person.intro}</AppText>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color="textSecondary">
          INTERESTS
        </AppText>
        <InterestList interests={person.interests} />
      </View>
    </View>
  );
}

/** A grey stand-in the shape of PersonDetails, while the person is still loading. */
export function PersonDetailsSkeleton() {
  const { layout, radius, size, spacing } = useTheme();
  return (
    <Skeleton style={{ gap: layout.sectionGap }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <SkeletonBlock width={size.avatarHero} height={size.avatarHero} radius={size.avatarHero * 0.28} />
        <SkeletonBlock width="50%" height={28} style={{ marginTop: spacing.md }} />
        <SkeletonBlock width="30%" height={14} />
      </View>
      <View style={[styles.photoRow, { gap: spacing.sm }]}>
        <SkeletonBlock width={styles.photo.width} height={styles.photo.height} radius={radius.lg} />
        <SkeletonBlock width={styles.photo.width} height={styles.photo.height} radius={radius.lg} />
      </View>
      <SkeletonBlock width="100%" height={96} radius={radius.lg} />
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  photo: { width: 150, height: 200 },
  photoRow: { flexDirection: 'row', overflow: 'hidden' },
});
