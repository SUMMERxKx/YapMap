// Email sign-in, step 2: enter the 8-digit code (one hidden input behind eight boxes).

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import * as api from '@/data/api';
import { errorMessage } from '@/lib/error-message';
import { signInWithEmail } from '@/state/store';
import { useTheme } from '@/theme';

const LENGTH = 8;
const RESEND_SECONDS = 60; // Supabase sends at most one code per minute

export default function Verify() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { colors, radius, type } = useTheme();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  // Count the resend cooldown down by one every second until it reaches zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (value.length !== LENGTH) return;
    setVerifying(true);
    setError(null);
    try {
      await signInWithEmail(email, value); // the root layout then moves on to profile setup
    } catch (error) {
      setError(errorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setCooldown(RESEND_SECONDS);
    setError(null);
    setCode('');
    try {
      await api.requestEmailCode(email);
    } catch (error) {
      setError(errorMessage(error, 'Could not resend the code.'));
    }
  };

  const onCodeChange = (text: string) => {
    // Keep digits only, and never more than the code length (pasted text can be longer).
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === LENGTH) verify(digits);
  };

  let resendLabel = 'Resend code';
  if (cooldown > 0) {
    resendLabel = `Resend in ${cooldown}s`;
  }

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
        We sent an {LENGTH}-digit code to <AppText variant="bodyStrong">{email}</AppText>
      </AppText>

      {/* One real input behind one display box per digit, so paste and SMS/email autofill work. */}
      <Pressable
        accessibilityLabel={`Code, ${code.length} of ${LENGTH} digits entered`}
        onPress={() => input.current?.focus()}
        style={styles.boxes}>
        {Array.from({ length: LENGTH }).map((_, index) => {
          // The box where the next digit will go is highlighted.
          const active = index === code.length && !error;

          let borderColor = colors.inputBorder;
          let borderWidth = 1;
          if (error) {
            borderColor = colors.destructive;
            borderWidth = 2;
          } else if (active) {
            borderColor = colors.green;
            borderWidth = 2;
          }

          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderColor,
                  borderWidth,
                },
              ]}>
              <AppText style={[type.title, { fontVariant: ['tabular-nums'] }]}>{code[index] ?? ''}</AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onCodeChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={LENGTH}
        style={styles.hidden}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {Boolean(error) && (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {error}
        </InfoNote>
      )}

      <View style={styles.resend}>
        <AppText variant="caption" color="textSecondary">
          Didn't receive it?
        </AppText>
        <Button label={resendLabel} variant="ghost" onPress={resend} disabled={cooldown > 0} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  box: { flex: 1, aspectRatio: 0.85, maxWidth: 56, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
