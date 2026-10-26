// Enter the emailed 8-digit code (one hidden input behind eight boxes). Used twice:
// `purpose=signup` confirms a new account, `purpose=reset` is the forgot-password code.
// The code can be typed, autofilled by the keyboard, or pasted from the email with the
// Paste code button or a long press on the boxes.

import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import * as api from '@/data/api';
import { useOneAtATime } from '@/hooks/use-one-at-a-time';
import { errorMessage } from '@/lib/error-message';
import { codeFromText } from '@/lib/one-time-code';
import { confirmSignUp } from '@/state/store';
import { useTheme } from '@/theme';

const LENGTH = 8;
const RESEND_SECONDS = 60; // Supabase sends at most one code per minute

export default function Verify() {
  const { email = '', purpose = 'signup' } = useLocalSearchParams<{ email: string; purpose: 'signup' | 'reset' }>();
  const { colors, radius, spacing, type } = useTheme();
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

  // The code submits itself once all 8 digits are in, and the button submits it too; a code
  // works once, so one attempt at a time (a second would show "invalid code" after success).
  const verify = useOneAtATime(async (value: string) => {
    if (value.length !== LENGTH) return;
    setVerifying(true);
    setError(null);
    try {
      if (purpose === 'reset') {
        // The code is checked when the new password is saved, since using it signs them in.
        router.push({ pathname: '/new-password', params: { email, code: value } });
      } else {
        await confirmSignUp(email, value); // the root layout then moves on to profile setup
      }
    } catch (error) {
      setError(errorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setVerifying(false);
    }
  });

  const resend = async () => {
    setCooldown(RESEND_SECONDS);
    setError(null);
    setCode('');
    try {
      if (purpose === 'reset') {
        await api.requestPasswordReset(email);
      } else {
        await api.resendSignUpCode(email);
      }
    } catch (error) {
      setError(errorMessage(error, 'Could not resend the code.'));
    }
  };

  const onCodeChange = (text: string) => {
    // Keep digits only, and never more than the code length (pasted text can be longer).
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === LENGTH) void verify(digits);
  };

  const pasteCode = async () => {
    let pasted = '';
    try {
      pasted = await Clipboard.getStringAsync();
    } catch {
      // Treated like an empty clipboard below.
    }
    const found = codeFromText(pasted, LENGTH);
    if (!found) {
      setError(`No code to paste. Copy the ${LENGTH}-digit code from the email, then try again.`);
      return;
    }
    onCodeChange(found);
  };

  let resendLabel = 'Resend code';
  if (cooldown > 0) {
    resendLabel = `Resend in ${cooldown}s`;
  }

  return (
    <Screen
      scroll
      footer={
        <Button label="Verify and continue" onPress={() => verify(code)} loading={verifying} disabled={code.length !== LENGTH} />
      }>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader
        title="Check your email"
        subtitle={
          <>
            We sent an {LENGTH}-digit code to <AppText variant="bodyStrong">{email}</AppText>
          </>
        }
      />

      {/* One real input behind one display box per digit, so keyboard autofill works; a long
          press pastes, since the hidden input can't show the system's Paste menu. */}
      <Pressable
        accessibilityLabel={`Code, ${code.length} of ${LENGTH} digits entered`}
        accessibilityHint="Long press to paste the code"
        onPress={() => input.current?.focus()}
        onLongPress={pasteCode}
        style={[styles.boxes, { gap: spacing.sm }]}>
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

      <Button label="Paste code" variant="secondary" icon="clipboard-outline" onPress={pasteCode} />

      {Boolean(error) && (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {error}
        </InfoNote>
      )}

      <View style={[styles.resend, { gap: spacing.sm }]}>
        <AppText color="textSecondary">Didn't receive it?</AppText>
        <Button label={resendLabel} variant="link" onPress={resend} disabled={cooldown > 0} />
      </View>

      {/* Sign-up never says whether the email already has an account, and Supabase emails
          nothing to one, so point those people to signing in instead. */}
      {purpose === 'signup' && (
        <AppText variant="caption" color="textSecondary">
          No code? If you already have an account,{' '}
          <AppText variant="caption" color="greenText" accessibilityRole="link" onPress={() => router.replace('/sign-in')}>
            sign in
          </AppText>{' '}
          or{' '}
          <AppText
            variant="caption"
            color="greenText"
            accessibilityRole="link"
            onPress={() => router.replace({ pathname: '/forgot-password', params: { email } })}>
            reset your password
          </AppText>
          .
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { flex: 1, aspectRatio: 0.8, maxWidth: 56, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
});
