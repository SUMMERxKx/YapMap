// Email sign-in, step 1: ask for the address and send a 6-digit code.

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import * as api from '@/data/api';

export default function Email() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      await api.requestEmailCode(email.trim());
      router.push({ pathname: '/verify', params: { email: email.trim() } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
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
        What's your email?
      </AppText>
      <AppText color="textSecondary">We'll send you a 6-digit code. No password needed.</AppText>
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
