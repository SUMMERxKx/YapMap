// Create an account: email and password, then an 8-digit code confirms the email.

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { PASSWORD_MIN_LENGTH } from '@/data/constants';
import { errorMessage } from '@/lib/error-message';
import { passwordProblem } from '@/lib/password-problem';
import { signUp } from '@/state/store';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreate = email.includes('@') && password.length > 0 && confirmation.length > 0;

  const create = async () => {
    if (!canCreate) return;
    const problem = passwordProblem(password, confirmation);
    if (problem) {
      setError(problem);
      return;
    }
    const trimmedEmail = email.trim();
    setError(null);
    setCreating(true);
    try {
      const needsCode = await signUp(trimmedEmail, password);
      // Without a code to enter, the root layout moves on by itself.
      if (needsCode) {
        router.push({ pathname: '/verify', params: { email: trimmedEmail, purpose: 'signup' } });
      }
    } catch (error) {
      setError(errorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <>
          <Button label="Create account" onPress={create} loading={creating} disabled={!canCreate} />
          <Button label="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/sign-in')} />
        </>
      }>
      <View style={{ alignSelf: 'flex-start' }}>
        <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
      </View>
      <AppText variant="title" accessibilityRole="header">
        Create your account
      </AppText>
      <AppText color="textSecondary">We'll email you an 8-digit code to confirm it's your address.</AppText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        autoFocus
      />
      <PasswordField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <PasswordField
        label="Confirm password"
        value={confirmation}
        onChangeText={setConfirmation}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={create}
      />
      {Boolean(error) && (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {error}
        </InfoNote>
      )}
    </Screen>
  );
}
