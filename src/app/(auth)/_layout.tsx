// The signed-out stack: welcome, sign in, sign up, the emailed code, and forgot password.

import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot-password" />
      {/* The reset code has already signed the user in here, so there's no going back. */}
      <Stack.Screen name="new-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
