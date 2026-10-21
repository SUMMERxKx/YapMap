// Profile tab: your profile as other people see it, a button to edit it, and a gear for Settings.

import { router } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PersonDetails } from '@/components/profile/person-details';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { asSeenByOthers } from '@/lib/format-person';
import { useStore } from '@/state/store';

export default function Profile() {
  const profile = useStore((state) => state.profile);
  // While you're live, people nearby also see your note.
  const note = useStore((state) => state.availability?.note ?? '');

  return (
    <Screen
      scroll
      edges={['top']}
      footer={<Button label="Edit profile" icon="create-outline" onPress={() => router.push('/edit-profile')} />}>
      <TopBar trailing={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />}>
        <AppText variant="title" accessibilityRole="header">
          Profile
        </AppText>
      </TopBar>
      <AppText color="textSecondary">This is how people nearby see you.</AppText>

      {profile !== null && (
        <Card>
          <PersonDetails person={asSeenByOthers(profile, note)} />
        </Card>
      )}
    </Screen>
  );
}
