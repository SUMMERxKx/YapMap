import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const signedIn = useStore((s) => s.session !== null);
  const hasProfile = useStore((s) => s.profile !== null);

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
            <Stack.Protected guard={signedIn && !hasProfile}>
              <Stack.Screen name="profile-setup" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && hasProfile}>
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
