import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { displayName, genderLabel } from '@/data/types';
import { FEATURES } from '@/config/features';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { InterestList } from '@/components/ui/chip';
import { VerifiedBadge } from '@/components/profile/verified-badge';

type Props = { person: NearbyPerson; subtitle?: string };

/** The full profile another person sees: photo, name, gender, intro and interests. */
export function PersonDetails({ person, subtitle }: Props) {
  const { colors, radius, spacing } = useTheme();
  const gender = genderLabel(person.gender);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Avatar name={person.firstName} photoUri={person.photoUri} size={150} />
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
          {displayName(person)}
        </AppText>
        {gender ? <AppText color="textSecondary">{gender}</AppText> : null}
        {FEATURES.selfieVerification && person.verified ? <VerifiedBadge /> : null}
        {person.note ? (
          <AppText variant="bodyStrong" color="greenText" align="center">
            {`"${person.note}"`}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {person.photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          accessibilityLabel={`${person.photos.length} photos of ${person.firstName}`}>
          {person.photos.map((uri, i) => (
            <Image
              key={uri}
              source={{ uri }}
              accessibilityLabel={`Photo ${i + 1} of ${person.firstName}`}
              style={[styles.photo, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }]}
              contentFit="cover"
              transition={150}
            />
          ))}
        </ScrollView>
      ) : null}

      <View
        style={[
          styles.box,
          { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
        ]}>
        <AppText variant="label" color="textSecondary">
          INTRO
        </AppText>
        <AppText>{person.intro}</AppText>
      </View>

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
  box: { gap: 6, borderWidth: StyleSheet.hairlineWidth },
  photo: { width: 150, height: 200 },
});
