// Shown instead of the app while the account is hidden (after reports, until they are reviewed)
// or suspended. The server refuses everything such an account tries ('account restricted'),
// so this says why, how to ask about it, and still lets the person delete their account.

import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { SwitchAccountButton } from '@/components/account/switch-account-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { LINKS, SUPPORT_EMAIL } from '@/config/links';
import { useTheme } from '@/theme';

export default function AccountRestricted() {
  const { spacing } = useTheme();

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button label="Email support" icon="mail-outline" onPress={() => Linking.openURL(LINKS.support)} />
          <SwitchAccountButton />
          <Button
            label="Delete account"
            variant="destructiveSoft"
            onPress={() => router.push('/account-restricted/delete-account')}
          />
        </View>
      }>
      <EmptyState
        mascot="sleepy"
        title="Your account is on hold"
        body={`Other people can't see your profile right now, and you can't go live, say hi, chat or post events. This happens when several people report an account, until we review the reports, or when an account breaks the community guidelines. If you think it's a mistake, email ${SUPPORT_EMAIL}.`}
      />
    </Screen>
  );
}
