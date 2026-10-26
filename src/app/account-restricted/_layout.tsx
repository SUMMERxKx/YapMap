// The account-on-hold screen, and deleting the account from it: all a hidden or suspended
// account can reach.

import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AccountRestrictedLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="delete-account" />
    </Stack>
  );
}
