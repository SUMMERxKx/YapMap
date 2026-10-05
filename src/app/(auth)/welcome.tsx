// First screen: the Yap pitch and the three ways to sign in.

import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { Screen } from '@/components/ui/screen';
import { signInWithProvider } from '@/state/store';
import { useTheme } from '@/theme';

export default function Welcome() {
  const { colors, spacing } = useTheme();

  return (
    <Screen
      backdrop={<GlassBackdrop />}
      footer={
        <>
          {/* Sign in with Apple is iOS-only (expo-apple-authentication). Swap in its official
              AppleAuthenticationButton when Supabase Auth is connected. */}
          {Platform.OS === 'ios' ? (
            <Button
              label="Continue with Apple"
              icon="logo-apple"
              variant="inverse"
              onPress={() => signInWithProvider('apple')}
            />
          ) : null}
          <Button
            label="Continue with Google"
            icon="logo-google"
            variant="secondary"
            onPress={() => signInWithProvider('google')}
          />
          <Button label="Continue with email" icon="mail-outline" variant="ghost" onPress={() => router.push('/email')} />
          <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: spacing.sm }}>
            By continuing you agree to the Community Rules and Privacy Policy.
          </AppText>
        </>
      }>
      {/* Logo and background image come with the new design (issue #7). */}
      <View style={[styles.hero, { gap: spacing.md }]}>
        <AppText
          accessibilityRole="header"
          style={[styles.wordmark, { color: colors.green }]}
          maxFontSizeMultiplier={1.2}>
          Yap
        </AppText>
        <AppText variant="title" align="center">
          The app that gets you off the app.
        </AppText>
        <AppText variant="body" color="textSecondary" align="center" style={styles.sub}>
          Turn green for a spontaneous conversation with someone right here in the room.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  wordmark: { fontSize: 72, lineHeight: 80, fontWeight: '800', letterSpacing: -2 },
  sub: { maxWidth: 320 },
});
