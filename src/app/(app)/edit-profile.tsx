// Edit profile: the same fields as setup, on one page.

import { router } from 'expo-router';
import { Alert } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/profile-form';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import type { Profile } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { saveProfile, useStore } from '@/state/store';

type ProfileValues = Omit<Profile, 'id'>;

export default function EditProfile() {
  const profile = useStore((state) => state.profile);

  const save = async (values: ProfileValues) => {
    // The 18+ confirmation isn't shown here, so keep the answer from setup.
    const isAdult = profile?.isAdult ?? values.isAdult;
    try {
      await saveProfile({ ...values, isAdult });
      router.back();
    } catch (error) {
      Alert.alert('Could not save', errorMessage(error, 'Try again.'));
    }
  };

  return (
    <Screen scroll>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Edit profile" />
      <ProfileForm initial={profile ?? undefined} submitLabel="Save" showAgeCheck={false} onSubmit={save} />
    </Screen>
  );
}
