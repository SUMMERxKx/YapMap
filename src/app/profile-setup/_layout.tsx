// Profile setup: one question per screen, sliding left; answers live in the shared draft.

import { Stack } from 'expo-router';

import { ProfileDraftProvider } from '@/state/profile-draft';
import { useTheme } from '@/theme';

export default function ProfileSetupLayout() {
  const { colors } = useTheme();
  return (
    <ProfileDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="name" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="about" />
        <Stack.Screen name="interests" />
        <Stack.Screen name="photo" />
        <Stack.Screen name="photos" />
      </Stack>
    </ProfileDraftProvider>
  );
}
