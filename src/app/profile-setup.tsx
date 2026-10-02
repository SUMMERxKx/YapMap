import { AppText } from '@/components/app-text';
import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';
import { saveProfile } from '@/state/store';

export default function ProfileSetup() {
  return (
    <Screen scroll>
      <AppText variant="title" accessibilityRole="header">
        Create your profile
      </AppText>
      <ProfileForm submitLabel="Ready to yap" onSubmit={saveProfile} />
    </Screen>
  );
}
