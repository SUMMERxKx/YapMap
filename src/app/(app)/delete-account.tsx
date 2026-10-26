// Delete account, from Settings or the account-on-hold screen: says exactly what is deleted, and
// only lets the button work once you've typed your first name, so nobody deletes their account
// with a stray tap.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import { errorMessage } from '@/lib/error-message';
import { checkRestricted, deleteAccount, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Everything that goes with the account: the photos first, then the database rows (each of these
// is linked to the account and deleted with it). Safety reports stay, without the account linked.
const DELETED = [
  'Your profile: name, gender, intro, interests and every photo',
  'Your live status, note and location',
  'Every say-hi request and 1:1 chat, with their messages',
  'Events you host and their group chats, and your messages in other events',
  'Your block list',
];

/** Whether what was typed is the name, ignoring capitals and spaces around it. */
function matchesName(typed: string, name: string) {
  const comparable = (text: string) => text.trim().normalize('NFC').toLowerCase();
  return comparable(name) !== '' && comparable(typed) === comparable(name);
}

export default function DeleteAccount() {
  const { colors, spacing } = useTheme();
  const firstName = useStore((state) => state.profile?.firstName ?? '');
  // On hold (hidden or suspended): the server keeps a hash of the email address, so it can't sign up again.
  const restricted = useStore((state) => state.restricted);
  let signIn = 'Your sign-in: your email address and password';
  if (restricted) signIn = 'Your password';
  const [typed, setTyped] = useState('');
  const confirmed = matchesName(typed, firstName);

  // The account may have been put on hold since the app last asked, which changes what is kept.
  useEffect(() => {
    void checkRestricted();
  }, []);

  // Said once they've typed as much as the name holds, so it doesn't flash while typing.
  let mismatch: string | null = null;
  if (!confirmed && typed.trim().length >= firstName.trim().length && typed.trim() !== '') {
    mismatch = "That isn't your first name as it is on your profile.";
  }

  const remove = async () => {
    if (!confirmed) return;
    try {
      // Removes your photos, then the account, then signs out: the app goes back to the welcome screen.
      await deleteAccount();
    } catch (error) {
      Alert.alert('Could not delete your account', errorMessage(error, 'Try again.'));
    }
  };

  return (
    <Screen
      scroll
      footer={
        <>
          <Button
            label="Delete my account"
            variant="destructive"
            onPress={remove}
            disabled={!confirmed}
            accessibilityHint="Type your first name above first"
          />
          <Button label="Keep my account" variant="ghost" onPress={() => router.back()} />
        </>
      }>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader
        title="Delete your account"
        subtitle="Your account and everything linked to it are deleted straight away. This can't be undone."
      />

      <Card style={{ gap: spacing.md }}>
        <AppText variant="label" color="textSecondary" accessibilityRole="header">
          WHAT IS DELETED
        </AppText>
        {[...DELETED, signIn].map((item) => (
          <View key={item} style={[styles.item, { gap: spacing.md }]}>
            <View style={[styles.bullet, { backgroundColor: colors.destructive, marginTop: spacing.sm }]} />
            <AppText style={styles.itemText}>{item}</AppText>
          </View>
        ))}
      </Card>
      {restricted ? (
        <InfoNote icon="mail-outline">
          Your account is on hold, so we keep a scrambled (hashed) copy of your email address so it can't be used to
          sign up again.
        </InfoNote>
      ) : (
        <InfoNote icon="log-out-outline">
          To use Yap again later, you'd create a new account. If you only want a break, sign out instead.
        </InfoNote>
      )}

      <View style={{ gap: spacing.sm }}>
        <AppText>
          To confirm, type your first name: <AppText variant="bodyStrong">{firstName}</AppText>
        </AppText>
        <TextField
          label="Your first name"
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="done"
          error={mismatch}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  itemText: { flex: 1 },
});
