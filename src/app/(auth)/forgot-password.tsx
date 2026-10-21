// Forgot password, step 1: email an 8-digit code that lets the user choose a new password.
// Accounts made before passwords existed set their first password this way too.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import * as api from '@/data/api';
import { errorMessage } from '@/lib/error-message';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
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
  };

  return (
    <Screen
      scroll
      footer={<Button label="Send code" onPress={send} loading={sending} disabled={!email.includes('@')} />}>
      <View style={{ alignSelf: 'flex-start' }}>
        <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
      </View>
      <AppText variant="title" accessibilityRole="header">
        Reset your password
      </AppText>
      <AppText color="textSecondary">
        We'll send an 8-digit code to your email. Enter it next, then choose a new password.
      </AppText>
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
