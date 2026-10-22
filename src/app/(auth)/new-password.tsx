// Forgot password, last step: choose the new password. Saving uses the emailed code too,
// then the root layout moves on into the app.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import { PASSWORD_MIN_LENGTH } from '@/data/constants';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
import { errorMessage } from '@/lib/error-message';
import { passwordProblem } from '@/lib/password-problem';
import { finishPasswordReset } from '@/state/store';

export default function NewPassword() {
  const { email = '', code = '' } = useLocalSearchParams<{ email: string; code: string }>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = password.length > 0 && confirmation.length > 0;

  // The button and the keyboard's Go key both save; the code works once, so one attempt at a time.
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
      await finishPasswordReset(email, code, password);
    } catch (error) {
      setError(errorMessage(error, 'Could not save your password. Try again.'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Screen
      scroll
      footer={<Button label="Save and sign in" onPress={save} loading={saving} disabled={!canSave} />}>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Choose a new password" subtitle="You'll use it with your email to sign in from now on." />
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
