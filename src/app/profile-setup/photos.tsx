import { AppText } from '@/components/app-text';
import { PhotoGrid } from '@/components/photo-grid';
import { SetupStep } from '@/components/setup-step';
import { FEATURES } from '@/config/features';
import { PHOTO_RANGE } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { saveProfile } from '@/state/store';

export default function PhotosStep() {
  const { draft, update } = useProfileDraft();
  const ready = draft.photos.length >= PHOTO_RANGE.min;

  const finish = () => {
    const { gender, photoUri } = draft;
    if (!gender || !photoUri || !ready) return;
    // Saving moves the app on to the next step (the app, or the selfie check when it's on).
    saveProfile({
      ...draft,
      gender,
      photoUri,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      intro: draft.intro.trim(),
    });
  };

  return (
    <SetupStep
      step={6}
      total={SETUP_STEPS}
      title={`Add ${PHOTO_RANGE.min} more photos`}
      subtitle="Show a bit more of you: what you like doing, places you go, people you hang out with."
      nextLabel="Finish"
      canContinue={ready}
      onNext={finish}>
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
