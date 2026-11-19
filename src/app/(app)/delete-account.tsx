// Delete account, from Settings, the account-on-hold screen or profile setup: says exactly what is
// deleted, and only lets the button work once you've typed your first name (or DELETE, before
// there is a profile), so nobody deletes their account with a stray tap.

import { router } from 'expo-router';
import { useState } from 'react';
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
import { deleteAccount, useStore } from '@/state/store';
import { useTheme } from '@/theme';

// Everything that goes with the account: the photos first, then the database rows (each of these
// is linked to the account and deleted with it). Only safety reports stay, without the account linked.
const DELETED = [
  'Your profile: name, gender, intro, interests and every photo',
  'Your live status, note and location',
  'Every say-hi request and 1:1 chat, with their messages, for both of you',
  'Events you host and their group chats, and your messages in other events',
  'Your block list',
  'Your sign-in: your email address and password',
];

// Before profile setup is finished there is no profile yet, only photos a save may have left.
const DELETED_DURING_SETUP = [
  'Any photos you added during profile setup',
  'Your sign-in: your email address and password',
];

// What to type when there is no first name to type yet.
const CONFIRM_WORD = 'DELETE';

/** Whether what was typed is the expected word, ignoring capitals and spaces around it. */
function matchesWord(typed: string, word: string) {
  const comparable = (text: string) => text.trim().normalize('NFC').toLowerCase();
  return comparable(word) !== '' && comparable(typed) === comparable(word);
}

export default function DeleteAccount() {
  const { colors, spacing } = useTheme();
  const hasProfile = useStore((state) => state.profile !== null);
  const firstName = useStore((state) => state.profile?.firstName ?? '').trim();
  const [typed, setTyped] = useState('');
  // The first name when the profile has one, otherwise the word DELETE.
  const byName = firstName !== '';
  const word = byName ? firstName : CONFIRM_WORD;
  const confirmed = matchesWord(typed, word);
  const deleted = hasProfile ? DELETED : DELETED_DURING_SETUP;

  // Said once they've typed as much as the name holds, so it doesn't flash while typing.
  let mismatch: string | null = null;
  if (!confirmed && typed.trim().length >= word.length && typed.trim() !== '') {
    mismatch = byName ? "That isn't your first name as it is on your profile." : `Type ${CONFIRM_WORD} to confirm.`;
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
            accessibilityHint={byName ? 'Type your first name above first' : `Type ${CONFIRM_WORD} above first`}
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
        {deleted.map((item) => (
          <View key={item} style={[styles.item, { gap: spacing.md }]}>
            <View style={[styles.bullet, { backgroundColor: colors.destructive, marginTop: spacing.sm }]} />
            <AppText style={styles.itemText}>{item}</AppText>
          </View>
        ))}
      </Card>
      <InfoNote icon="flag-outline">
        Safety reports you made, or that were made about you, are kept without your account linked, so we can still act
        on them. Nothing else is kept.
      </InfoNote>
      <InfoNote icon="log-out-outline">
        To use Yap again later, you'd create a new account. If you only want a break, sign out instead.
      </InfoNote>

      <View style={{ gap: spacing.sm }}>
        <AppText>
          {byName ? 'To confirm, type your first name: ' : 'To confirm, type '}
          <AppText variant="bodyStrong">{word}</AppText>
        </AppText>
        <TextField
          label={byName ? 'Your first name' : `Type ${CONFIRM_WORD}`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize={byName ? 'words' : 'characters'}
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
