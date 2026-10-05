import { StyleSheet, View } from 'react-native';

import type { NearbyPerson } from '@/data/types';
import { displayName, genderLabel } from '@/data/types';
import { FEATURES } from '@/config/features';
import { useTheme } from '@/theme';

import { AppText } from './app-text';
import { Avatar } from './avatar';
import { InterestList } from './chip';
import { VerifiedBadge } from './verified-badge';

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
        {subtitle ? (
          <AppText color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

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
});
