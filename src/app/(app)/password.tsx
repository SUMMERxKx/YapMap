// Change password, from Settings.

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import * as api from '@/data/api';
import { PASSWORD_MIN_LENGTH } from '@/data/constants';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
import { errorMessage } from '@/lib/error-message';
import { passwordProblem } from '@/lib/password-problem';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = password.length > 0 && confirmation.length > 0;

  // The button and the keyboard's Go key both save; one attempt at a time.
  const save = useOneAtATime(async () => {
    if (!canSave) return;
    const problem = passwordProblem(password, confirmation);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.setPassword(password);
      Alert.alert('Password changed', 'Use your new password next time you sign in.');
      router.back();
    } catch (error) {
      setError(errorMessage(error, 'Could not change your password. Try again.'));
      setSaving(false);
    }
  });

  return (
    <Screen
      scroll
      footer={<Button label="Save password" onPress={save} loading={saving} disabled={!canSave} />}>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Change password" subtitle="Choose a new password to sign in with." />
      <PasswordField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        autoFocus
      />
      <PasswordField
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={save}
      />
      {Boolean(error) && (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {error}
        </InfoNote>
      )}
    </Screen>
  );
}
