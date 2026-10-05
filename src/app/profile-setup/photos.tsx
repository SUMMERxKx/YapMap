// Setup step 6: at least 4 more photos, then finish.

import { useState } from 'react';
import { Alert } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PhotoGrid } from '@/components/profile/photo-grid';
import { SetupStep } from '@/components/profile/setup-step';
import { FEATURES } from '@/config/features';
import { PHOTO_RANGE } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { saveProfile } from '@/state/store';

export default function PhotosStep() {
  const { draft, update } = useProfileDraft();
  const [saving, setSaving] = useState(false);
  const ready = draft.photos.length >= PHOTO_RANGE.min;

  // Uploads the photos and saves the profile; the root layout then moves on
  // (to the app, or to the selfie check when that feature is on).
  const finish = async () => {
    const { gender, photoUri } = draft;
    if (!gender || !photoUri || !ready || saving) return;
    setSaving(true);
    try {
      await saveProfile({
        ...draft,
        gender,
        photoUri,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        intro: draft.intro.trim(),
      });
    } catch (e) {
      Alert.alert('Could not save your profile', e instanceof Error ? e.message : 'Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <SetupStep
      step={6}
      total={SETUP_STEPS}
      title={`Add ${PHOTO_RANGE.min} more photos`}
      subtitle="Show a bit more of you: what you like doing, places you go, people you hang out with."
      nextLabel="Finish"
      canContinue={ready}
      onNext={() => void finish()}
      loading={saving}>
      <PhotoGrid photos={draft.photos} onChange={(photos) => update({ photos })} />
      <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
        {ready
          ? `${draft.photos.length} added. You can add up to ${PHOTO_RANGE.max}.`
          : `${draft.photos.length} of ${PHOTO_RANGE.min} required added.`}
        {FEATURES.selfieVerification ? ' Next, a quick selfie confirms it\'s really you.' : ''}
      </AppText>
    </SetupStep>
  );
}
