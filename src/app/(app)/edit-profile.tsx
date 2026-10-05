// Edit profile: the same fields as setup, on one page.

import { router } from 'expo-router';

import { InfoNote } from '@/components/ui/info-note';
import { ProfileForm } from '@/components/profile/profile-form';
import { Screen } from '@/components/ui/screen';
import { FEATURES } from '@/config/features';
import { saveProfile, useStore } from '@/state/store';

export default function EditProfile() {
  const profile = useStore((s) => s.profile);
  return (
    <Screen scroll edges={['bottom']}>
      {FEATURES.selfieVerification ? (
        <InfoNote icon="shield-checkmark-outline">
          If you change your photo, you'll take a quick selfie again to keep your Verified badge.
        </InfoNote>
      ) : null}
      <ProfileForm
        initial={profile ?? undefined}
        submitLabel="Save"
        showAgeCheck={false}
        onSubmit={(values) => {
          const photoChanged = values.photoUri !== profile?.photoUri;
          // A new photo means a new selfie check: the root layout moves to it automatically.
          if (!photoChanged || !FEATURES.selfieVerification) router.back();
          saveProfile({ ...values, isAdult: profile?.isAdult ?? values.isAdult });
        }}
      />
    </Screen>
  );
}
