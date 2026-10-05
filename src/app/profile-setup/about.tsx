// Setup step 3: the intro.

import { router } from 'expo-router';

import { SetupStep } from '@/components/profile/setup-step';
import { TextField } from '@/components/ui/text-field';
import { LIMITS } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';

export default function AboutStep() {
  const { draft, update } = useProfileDraft();
  return (
    <SetupStep
      step={3}
      total={SETUP_STEPS}
      title="Tell us a bit about yourself"
      subtitle="What do you do, what are you up to today, what could you talk about for hours?"
      canContinue={draft.intro.trim().length > 0}
      onNext={() => router.push('/profile-setup/interests')}>
      <TextField
        label="Intro"
        value={draft.intro}
        onChangeText={(intro) => update({ intro })}
        maxLength={LIMITS.intro}
        showCounter
        multiline
        autoFocus
        placeholder="e.g. Studying computer science, always up for talking about startups, films or the best coffee in town."
      />
    </SetupStep>
  );
}
