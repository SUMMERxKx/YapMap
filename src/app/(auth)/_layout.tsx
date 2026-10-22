// The signed-out stack: welcome, sign in, sign up, the emailed code, and forgot password.

import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Android gets the same smooth slide-in from the right as iPhone (iOS keeps its own).
        animation: 'ios_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="new-password" />
    </Stack>
  );
}
