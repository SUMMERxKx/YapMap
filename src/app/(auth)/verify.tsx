// Email sign-in, step 2: enter the 6-digit code (one hidden input behind six boxes).

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import * as api from '@/data/api';
import { signInWithEmail } from '@/state/store';
import { useTheme } from '@/theme';

const LENGTH = 6;
const RESEND_SECONDS = 30;

export default function Verify() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { colors, radius, type } = useTheme();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (value.length !== LENGTH) return;
    setVerifying(true);
    setError(null);
    try {
      await signInWithEmail(email, value); // the root layout then moves on to profile setup
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setCooldown(RESEND_SECONDS);
    setError(null);
    setCode('');
    await api.requestEmailCode(email);
  };

  return (
    <Screen
      scroll
      footer={
        <Button label="Verify and continue" onPress={() => verify()} loading={verifying} disabled={code.length !== LENGTH} />
      }>
      <View style={{ alignSelf: 'flex-start' }}>
        <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
      </View>
      <AppText variant="title" accessibilityRole="header">
        Check your email
      </AppText>
      <AppText color="textSecondary">
        We sent a 6-digit code to <AppText variant="bodyStrong">{email}</AppText>
      </AppText>

      {/* One real input behind six display boxes, so paste and SMS/email autofill work. */}
      <Pressable
        accessibilityLabel={`Code, ${code.length} of 6 digits entered`}
        onPress={() => input.current?.focus()}
        style={styles.boxes}>
        {Array.from({ length: LENGTH }).map((_, i) => {
          const active = i === code.length && !error;
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.destructive : active ? colors.green : colors.inputBorder,
                  borderWidth: error || active ? 2 : 1,
                },
              ]}>
              <AppText style={[type.title, { fontVariant: ['tabular-nums'] }]}>{code[i] ?? ''}</AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, LENGTH);
          setCode(digits);
          setError(null);
          if (digits.length === LENGTH) verify(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={LENGTH}
        style={styles.hidden}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {error ? (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {error}
        </InfoNote>
      ) : null}

      <View style={styles.resend}>
        <AppText variant="caption" color="textSecondary">
          Didn't receive it?
        </AppText>
        <Button
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          variant="ghost"
          onPress={resend}
          disabled={cooldown > 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: { flex: 1, aspectRatio: 0.85, maxWidth: 56, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
