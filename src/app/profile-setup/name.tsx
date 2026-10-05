// Setup step 1: first and last name (others only ever see the last initial).

import { router } from 'expo-router';
import { useRef } from 'react';
import type { TextInput } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SetupStep } from '@/components/profile/setup-step';
import { TextField } from '@/components/ui/text-field';
import { LIMITS } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';

export default function NameStep() {
  const { draft, update } = useProfileDraft();
  const lastNameInput = useRef<TextInput>(null);
  const ready = draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0;
  const next = () => ready && router.push('/profile-setup/gender');

  return (
    <SetupStep step={1} total={SETUP_STEPS} title="What's your name?" canContinue={ready} onNext={next}>
      <TextField
        label="First name"
        value={draft.firstName}
        onChangeText={(firstName) => update({ firstName })}
        maxLength={LIMITS.firstName}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        placeholder="e.g. Samar"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastNameInput.current?.focus()}
        autoFocus
      />
      <TextField
        ref={lastNameInput}
        label="Last name"
        value={draft.lastName}
        onChangeText={(lastName) => update({ lastName })}
        maxLength={LIMITS.lastName}
        autoComplete="family-name"
        textContentType="familyName"
        autoCapitalize="words"
        placeholder="e.g. Khajuria"
        returnKeyType="next"
        onSubmitEditing={next}
      />
      <AppText variant="caption" color="textSecondary">
        People nearby see your first name and last initial only.
      </AppText>
    </SetupStep>
  );
}
