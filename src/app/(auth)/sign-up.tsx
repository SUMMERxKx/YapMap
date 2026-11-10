// Create an account: email and password, then an 8-digit code confirms the email.

import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import { LINKS } from '@/config/links';
import { PASSWORD_MIN_LENGTH } from '@/data/constants';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
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

  // The button and the keyboard's Go key both create the account; one attempt at a time, so
  // only one code is emailed.
  const create = useOneAtATime(async () => {
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
  });

  return (
    <Screen
      scroll
      footer={
        <>
          <AppText variant="caption" color="textSecondary" align="center">
            By creating an account, you agree to Yap's{' '}
            <AppText variant="caption" color="greenText" accessibilityRole="link" onPress={() => Linking.openURL(LINKS.terms)}>
              Terms of Service
            </AppText>{' '}
            and{' '}
            <AppText variant="caption" color="greenText" accessibilityRole="link" onPress={() => router.push('/guidelines')}>
              Community Guidelines
            </AppText>
            , and confirm you've read the{' '}
            <AppText variant="caption" color="greenText" accessibilityRole="link" onPress={() => Linking.openURL(LINKS.privacy)}>
              Privacy Policy
            </AppText>
            , which explains what Yap keeps about you.
          </AppText>
          <Button label="Create account" onPress={create} loading={creating} disabled={!canCreate} />
          <Button label="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/sign-in')} />
        </>
      }>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Create your account" subtitle="We'll email you an 8-digit code to confirm it's your address." />
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
