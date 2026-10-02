import { router } from 'expo-router';

import { InfoNote } from '@/components/info-note';
import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';
import { saveProfile, useStore } from '@/state/store';

export default function EditProfile() {
  const profile = useStore((s) => s.profile);
  return (
    <Screen scroll edges={['bottom']}>
      <InfoNote icon="shield-checkmark-outline">
        If you change your photo, you'll take a quick selfie again to keep your Verified badge.
      </InfoNote>
      <ProfileForm
        initial={profile ?? undefined}
        submitLabel="Save"
        showAgeCheck={false}
        onSubmit={(values) => {
          const photoChanged = values.photoUri !== profile?.photoUri;
          // A new photo means a new selfie check: the root layout moves to it automatically.
          if (!photoChanged) router.back();
          saveProfile({ ...values, isAdult: profile?.isAdult ?? values.isAdult });
        }}
      />
    </Screen>
  );
}
