// Profile tab: your profile, blocked people, legal links, sign out and account deletion.

import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { FEATURES } from '@/config/features';
import { VerifiedBadge } from '@/components/profile/verified-badge';
import { deleteAccount, signOut, simulateIncoming, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Placeholder pages until the real ones are published.
const LINKS = {
  rules: 'https://example.com/yap/community-rules',
  privacy: 'https://example.com/yap/privacy',
  terms: 'https://example.com/yap/terms',
  support: 'mailto:support@example.com',
};

export default function Profile() {
  const { colors, radius, spacing } = useTheme();
  const profile = useStore((s) => s.profile);
  const blockedCount = useStore((s) => s.blockedIds.length);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, photo and everything linked to your account. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => deleteAccount() },
      ],
    );

  return (
    <Screen scroll edges={['top']}>
      <AppText variant="title" accessibilityRole="header">
        Profile
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${profile?.firstName} ${profile?.lastName}. Edit profile`}
        onPress={() => router.push('/edit-profile')}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
          },
        ]}>
        <Avatar name={profile?.firstName ?? '?'} photoUri={profile?.photoUri ?? null} size={64} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">
            {profile?.firstName} {profile?.lastName}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {profile?.intro}
          </AppText>
          {FEATURES.selfieVerification && profile?.verified ? (
            <View style={{ marginTop: 4 }}>
              <VerifiedBadge align="flex-start" />
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <ListGroup>
        <ListRow
          label="Blocked people"
          detail={blockedCount ? String(blockedCount) : undefined}
          onPress={() => router.push('/blocked')}
        />
        <ListRow label="Notification settings" onPress={() => Linking.openSettings()} last />
      </ListGroup>

      <ListGroup>
        <ListRow label="Community rules" trailing="external" onPress={() => Linking.openURL(LINKS.rules)} />
        <ListRow label="Privacy policy" trailing="external" onPress={() => Linking.openURL(LINKS.privacy)} />
        <ListRow label="Terms of service" trailing="external" onPress={() => Linking.openURL(LINKS.terms)} />
        <ListRow label="Contact support" trailing="external" onPress={() => Linking.openURL(LINKS.support)} last />
      </ListGroup>

      <View style={{ gap: spacing.sm }}>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <Button label="Delete account" variant="destructiveSoft" onPress={confirmDelete} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            DEVELOPMENT ONLY
          </AppText>
          <Button label="Simulate an incoming request" variant="secondary" icon="flask-outline" onPress={simulateIncoming} />
        </View>
      ) : null}

      <AppText variant="caption" color="textSecondary" align="center">
        Yap {Constants.expoConfig?.version}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth },
});
