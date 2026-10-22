// Forgot password, step 1: email an 8-digit code that lets the user choose a new password.
// Accounts made before passwords existed set their first password this way too.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { TopBar } from '@/components/ui/top-bar';
import * as api from '@/data/api';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
import { errorMessage } from '@/lib/error-message';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // The button and the keyboard's Go key both send; one code at a time.
  const send = useOneAtATime(async () => {
    if (!email.includes('@')) return;
    const trimmedEmail = email.trim();
    setError(null);
    setSending(true);
    try {
      await api.requestPasswordReset(trimmedEmail);
      router.push({ pathname: '/verify', params: { email: trimmedEmail, purpose: 'reset' } });
    } catch (error) {
      setError(errorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setSending(false);
    }
  });

  return (
    <Screen
      scroll
      footer={<Button label="Send code" onPress={send} loading={sending} disabled={!email.includes('@')} />}>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader
        title="Reset your password"
        subtitle="We'll send an 8-digit code to your email. Enter it next, then choose a new password."
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={send}
        error={error}
        autoFocus
      />
    </Screen>
  );
}
