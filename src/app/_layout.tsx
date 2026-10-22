// Root layout: themes the app and routes people to the right step
// (sign in -> profile setup -> selfie check, when enabled -> the app) with guarded stacks.

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CantLoad } from '@/components/account/cant-load';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { FEATURES } from '@/config/features';
import { init, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const booted = useStore((state) => state.booted);
  const loadFailed = useStore((state) => state.loadFailed);
  const signedIn = useStore((state) => state.session !== null);
  const hasProfile = useStore((state) => state.profile !== null);
  const profileVerified = useStore((state) => state.profile?.verified === true);
  // With verification switched off, everyone with a profile counts as verified.
  const verified = profileVerified || !FEATURES.selfieVerification;

  // Which stack the person may see right now.
  const showSignIn = !signedIn;
  const showProfileSetup = signedIn && !hasProfile;
  const showSelfieCheck = signedIn && hasProfile && !verified;
  const showApp = signedIn && hasProfile && verified;

  let navTheme = DefaultTheme;
  let statusBarStyle: 'light' | 'dark' = 'dark';
  if (scheme === 'dark') {
    navTheme = DarkTheme;
    statusBarStyle = 'light';
  }

  // The navigation theme, with our own colours on top.
  const appNavTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.green,
    },
  };

  // Restore the stored session and profile once, before showing any screen.
  useEffect(() => {
    void init();
  }, []);

  if (!booted) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={appNavTheme}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Signed in, but the profile didn't load: a retry screen, never profile setup. */}
          {loadFailed && <CantLoad />}
          {!loadFailed && (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Protected guard={showSignIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              {/* Exactly one of these is allowed at a time, so the app always lands on the right step. */}
              <Stack.Protected guard={showProfileSetup}>
                <Stack.Screen name="profile-setup" />
              </Stack.Protected>
              <Stack.Protected guard={showSelfieCheck}>
                <Stack.Screen name="verify-face" />
              </Stack.Protected>
              <Stack.Protected guard={showApp}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              {/* Reading pages, open whether signed in or not (sign-up and Settings link to them). */}
              <Stack.Screen name="guidelines" />
              <Stack.Screen name="acknowledgements" />
            </Stack>
          )}
          <OfflineBanner />
        </View>
        <StatusBar style={statusBarStyle} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
