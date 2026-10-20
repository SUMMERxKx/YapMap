// Edit profile: the same fields as setup, on one page.

import { router } from 'expo-router';
import { Alert } from 'react-native';

import { InfoNote } from '@/components/ui/info-note';
import { ProfileForm } from '@/components/profile/profile-form';
import { Screen } from '@/components/ui/screen';
import { FEATURES } from '@/config/features';
import type { Profile } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { saveProfile, useStore } from '@/state/store';

type ProfileValues = Omit<Profile, 'id' | 'verified'>;

export default function EditProfile() {
  const profile = useStore((state) => state.profile);

  const save = async (values: ProfileValues) => {
    const photoChanged = values.photoUri !== profile?.photoUri;
    // The 18+ confirmation isn't shown here, so keep the answer from setup.
    const isAdult = profile?.isAdult ?? values.isAdult;
    try {
      await saveProfile({ ...values, isAdult });
      // A new photo means a new selfie check: the root layout moves to it automatically.
      if (!photoChanged || !FEATURES.selfieVerification) router.back();
    } catch (error) {
      Alert.alert('Could not save', errorMessage(error, 'Try again.'));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      {FEATURES.selfieVerification && (
        <InfoNote icon="shield-checkmark-outline">
          If you change your photo, you'll take a quick selfie again to keep your Verified badge.
        </InfoNote>
      )}
      <ProfileForm initial={profile ?? undefined} submitLabel="Save" showAgeCheck={false} onSubmit={save} />
    </Screen>
  );
}
