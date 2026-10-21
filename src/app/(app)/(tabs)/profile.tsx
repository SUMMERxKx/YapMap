// Profile tab: your profile, blocked people, password, legal links, sign out and account deletion.

import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { FEATURES } from '@/config/features';
import { errorMessage } from '@/lib/error-message';
import { VerifiedBadge } from '@/components/profile/verified-badge';
import { deleteAccount, signOut, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Placeholder pages until the real ones are published.
const LINKS = {
  rules: 'https://example.com/yap/community-rules',
  privacy: 'https://example.com/yap/privacy',
  terms: 'https://example.com/yap/terms',
  support: 'mailto:support@example.com',
};

export default function Profile() {
  const { colors, size, spacing } = useTheme();
  const profile = useStore((state) => state.profile);
  const blockedCount = useStore((state) => state.blockedIds.length);

  // The row shows how many people are blocked, and nothing when there are none.
  let blockedDetail: string | undefined;
  if (blockedCount > 0) {
    blockedDetail = String(blockedCount);
  }

  const showVerified = FEATURES.selfieVerification && profile?.verified === true;

  const onDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      Alert.alert('Could not delete your account', errorMessage(error, 'Try again.'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, photo and everything linked to your account. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: onDeleteAccount },
      ],
    );

  return (
    <Screen scroll edges={['top']}>
      <AppText variant="title" accessibilityRole="header">
        Profile
      </AppText>

      <Card
        accessibilityLabel={`${profile?.firstName} ${profile?.lastName}. Edit profile`}
        onPress={() => router.push('/edit-profile')}
        style={{ ...styles.card, gap: spacing.md }}>
        <Avatar name={profile?.firstName ?? '?'} photoUri={profile?.photoUri ?? null} size={size.avatarLarge} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="bodyStrong">
            {profile?.firstName} {profile?.lastName}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {profile?.intro}
          </AppText>
          {showVerified && (
            <View style={{ marginTop: spacing.xs }}>
              <VerifiedBadge align="flex-start" />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={size.iconMedium} color={colors.textSecondary} />
      </Card>

      <ListGroup>
        <ListRow
          label="Blocked people"
          detail={blockedDetail}
          onPress={() => router.push('/blocked')}
        />
        <ListRow label="Change password" onPress={() => router.push('/password')} />
        <ListRow label="Notification settings" onPress={() => Linking.openSettings()} last />
      </ListGroup>

      <ListGroup>
        <ListRow label="Community rules" trailing="external" onPress={() => Linking.openURL(LINKS.rules)} />
        <ListRow label="Privacy policy" trailing="external" onPress={() => Linking.openURL(LINKS.privacy)} />
        <ListRow label="Terms of service" trailing="external" onPress={() => Linking.openURL(LINKS.terms)} />
        <ListRow label="Contact support" trailing="external" onPress={() => Linking.openURL(LINKS.support)} last />
      </ListGroup>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <Button label="Delete account" variant="destructiveSoft" onPress={confirmDelete} />
      </View>

      <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: spacing.xs }}>
        Yap {Constants.expoConfig?.version}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
});
