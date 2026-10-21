import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { displayName, genderLabel } from '@/lib/format-person';
import { FEATURES } from '@/config/features';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Card } from '@/components/ui/card';
import { InterestList } from '@/components/ui/chip';
import { VerifiedBadge } from '@/components/profile/verified-badge';

type Props = { person: NearbyPerson; subtitle?: string };

/** The full profile another person sees: photo, name, gender, intro and interests. */
export function PersonDetails({ person, subtitle }: Props) {
  const { colors, layout, radius, size, spacing } = useTheme();
  const gender = genderLabel(person.gender);
  const showVerified = FEATURES.selfieVerification && person.verified;

  return (
    <View style={{ gap: layout.sectionGap }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Avatar name={person.firstName} photoUri={person.photoUri} size={size.avatarHero} />
        <AppText variant="title" accessibilityRole="header" align="center" style={{ marginTop: spacing.md }}>
          {displayName(person)}
        </AppText>
        {gender !== null && <AppText color="textSecondary">{gender}</AppText>}
        {showVerified && <VerifiedBadge />}
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

      {person.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          accessibilityLabel={`${person.photos.length} photos of ${person.firstName}`}>
          {person.photos.map((uri, index) => (
            <Image
              key={uri}
              source={{ uri }}
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

const styles = StyleSheet.create({
  photo: { width: 150, height: 200 },
});
