// Sign in with email and password.

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import * as api from '@/data/api';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
import { errorMessage } from '@/lib/error-message';
import { signInWithPassword } from '@/state/store';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const canSignIn = email.includes('@') && password.length > 0;

  // The button and the keyboard's Go key both sign in; one attempt at a time.
  const signIn = useOneAtATime(async () => {
    if (!canSignIn) return;
    const trimmedEmail = email.trim();
    setError(null);
    setSigningIn(true);
    try {
      const result = await signInWithPassword(trimmedEmail, password);
      // When signed in, the root layout moves on by itself.
      if (result === 'unconfirmed') {
        // The account was never confirmed: send a fresh code and go to the code screen.
        try {
          await api.resendSignUpCode(trimmedEmail);
        } catch {
          // Most likely a code went out less than a minute ago; that one still works.
        }
        router.push({ pathname: '/verify', params: { email: trimmedEmail, purpose: 'signup' } });
      }
    } catch (error) {
      setError(errorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setSigningIn(false);
    }
  });

  return (
    <Screen
      scroll
      footer={
        <>
          <Button label="Sign in" onPress={signIn} loading={signingIn} disabled={!canSignIn} />
          <Button label="New here? Create an account" variant="ghost" onPress={() => router.replace('/sign-up')} />
        </>
      }>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader title="Welcome back" />
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
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={signIn}
        error={error}
      />
      <View style={{ alignSelf: 'flex-end' }}>
        <Button
          label="Forgot password?"
          variant="link"
          onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
        />
      </View>
      {/* Accounts made before passwords existed have none yet; Forgot password sets one. */}
      <InfoNote icon="key-outline">
        Signed up with just an emailed code before? Tap Forgot password to set a password.
      </InfoNote>
    </Screen>
  );
}
