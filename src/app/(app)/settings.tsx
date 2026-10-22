// Settings, from the gear on the Profile tab: account, safety and legal links,
// sign out and account deletion.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import { LINKS } from '@/config/links';
import { errorMessage } from '@/lib/error-message';
import { signOut, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Settings() {
  const { spacing } = useTheme();
  const blockedCount = useStore((state) => state.blockedIds.length);

  // The row shows how many people are blocked, and nothing when there are none.
  let blockedDetail: string | undefined;
  if (blockedCount > 0) {
    blockedDetail = String(blockedCount);
  }

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Could not sign out', errorMessage(error, 'Try again.'));
    }
  };

  return (
    <Screen scroll>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Settings" />

      <SettingsSection title="ACCOUNT">
        <ListGroup>
          <ListRow label="Change password" onPress={() => router.push('/password')} />
          <ListRow label="Blocked people" detail={blockedDetail} onPress={() => router.push('/blocked')} />
          <ListRow label="Notification settings" trailing="external" onPress={() => Linking.openSettings()} last />
        </ListGroup>
      </SettingsSection>

      <SettingsSection title="HELP">
        <ListGroup>
          <ListRow label="View tutorial" onPress={() => router.push('/tutorial')} last />
        </ListGroup>
      </SettingsSection>

      <SettingsSection title="SAFETY AND LEGAL">
        <ListGroup>
          <ListRow label="Community guidelines" onPress={() => router.push('/guidelines')} />
          <ListRow label="Privacy policy" trailing="external" onPress={() => Linking.openURL(LINKS.privacy)} />
          <ListRow label="Terms of service" trailing="external" onPress={() => Linking.openURL(LINKS.terms)} />
          <ListRow label="Acknowledgements" onPress={() => router.push('/acknowledgements')} />
          <ListRow label="Contact support" trailing="external" onPress={() => Linking.openURL(LINKS.support)} last />
        </ListGroup>
      </SettingsSection>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Button label="Sign out" variant="secondary" onPress={onSignOut} />
        {/* A screen of its own: it lists what is deleted and asks you to type your first name. */}
        <Button label="Delete account" variant="destructiveSoft" onPress={() => router.push('/delete-account')} />
      </View>

      <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: spacing.xs }}>
        Yap {Constants.expoConfig?.version}
      </AppText>
    </Screen>
  );
}

/** A small label over a group of rows, like the section headings in the phone's own Settings. */
function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}
