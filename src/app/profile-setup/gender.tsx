// Setup step 2: gender, and whether to show it on the profile.

import { router } from 'expo-router';
import { View } from 'react-native';

import { RadioOption } from '@/components/ui/radio-option';
import { SetupStep } from '@/components/profile/setup-step';
import { ToggleRow } from '@/components/ui/toggle-row';
import { GENDERS } from '@/data/constants';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { useTheme } from '@/theme';

export default function GenderStep() {
  const { spacing } = useTheme();
  const { draft, update } = useProfileDraft();
  const preferNotToSay = draft.gender === 'prefer-not';

  let showGenderDescription = 'Turn this off to keep it private. You can change it later.';
  if (preferNotToSay) {
    showGenderDescription = 'Nothing is shown when you choose "Prefer not to say".';
  }

  return (
    <SetupStep
      step={2}
      total={SETUP_STEPS}
      title="What's your gender?"
      canContinue={draft.gender !== null}
      onNext={() => router.push('/profile-setup/about')}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Gender" style={{ gap: spacing.sm }}>
        {GENDERS.map((option) => (
          <RadioOption
            key={option.value}
            label={option.label}
            selected={draft.gender === option.value}
            onPress={() => update({ gender: option.value })}
          />
        ))}
      </View>
      <ToggleRow
        label="Show my gender on my profile"
        description={showGenderDescription}
        value={draft.showGender && !preferNotToSay}
        onChange={(showGender) => update({ showGender })}
        disabled={preferNotToSay}
      />
    </SetupStep>
  );
}

