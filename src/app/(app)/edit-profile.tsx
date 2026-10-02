import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';
import { saveProfile, useStore } from '@/state/store';

export default function EditProfile() {
  const profile = useStore((s) => s.profile);
  return (
    <Screen scroll edges={['bottom']}>
      <ProfileForm
        initial={profile ?? undefined}
        submitLabel="Save"
        showAgeCheck={false}
        onSubmit={(values) => {
          saveProfile({ ...values, isAdult: profile?.isAdult ?? values.isAdult });
          router.back();
        }}
      />
    </Screen>
  );
}
