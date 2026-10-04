import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { SetupStep } from '@/components/setup-step';
import { INTEREST_RANGE, INTERESTS } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';

export default function InterestsStep() {
  const { draft, update } = useProfileDraft();
  const picked = draft.interests;
  const atMax = picked.length >= INTEREST_RANGE.max;

  const toggle = (interest: string) =>
    update({
      interests: picked.includes(interest)
        ? picked.filter((i) => i !== interest)
        : atMax
          ? picked
          : [...picked, interest],
    });

  return (
    <SetupStep
      step={4}
      total={SETUP_STEPS}
      title="What are you into?"
      subtitle={`Pick ${INTEREST_RANGE.min} to ${INTEREST_RANGE.max}, so people have something to talk about.`}
      canContinue={picked.length >= INTEREST_RANGE.min}
      onNext={() => router.push('/profile-setup/photo')}>
      <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
        {picked.length}/{INTEREST_RANGE.max} picked
      </AppText>
      <View style={styles.wrap}>
        {INTERESTS.map((interest) => {
          const selected = picked.includes(interest);
          return (
            <Chip
              key={interest}
              label={interest}
              selected={selected}
              disabled={!selected && atMax}
              onPress={() => toggle(interest)}
            />
          );
        })}
      </View>
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
