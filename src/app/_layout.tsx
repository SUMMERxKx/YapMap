import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { FEATURES } from '@/config/features';
import { useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const signedIn = useStore((s) => s.session !== null);
  const hasProfile = useStore((s) => s.profile !== null);
  // With verification switched off, everyone with a profile counts as verified.
  const verified = useStore((s) => s.profile?.verified === true) || !FEATURES.selfieVerification;

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            background: colors.background,
            card: colors.surface,
            text: colors.textPrimary,
            border: colors.border,
            primary: colors.green,
          },
        }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            {/* Exactly one of these is allowed at a time, so the app always lands on the right step. */}
            <Stack.Protected guard={signedIn && !hasProfile}>
              <Stack.Screen name="profile-setup" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && hasProfile && !verified}>
              <Stack.Screen name="verify-face" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && hasProfile && verified}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
          <OfflineBanner />
        </View>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
