import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  const incomingId = useStore((s) => s.incoming?.id);
  const matchId = useStore((s) => s.match?.id);
  const shown = useRef<{ incoming?: string; match?: string }>({});

  // An incoming request or a new match takes over the screen, wherever the user is.
  // When push notifications are added, tapping one opens these same routes.
  useEffect(() => {
    if (incomingId && shown.current.incoming !== incomingId) {
      shown.current.incoming = incomingId;
      router.push('/incoming');
    }
  }, [incomingId]);

  useEffect(() => {
    if (matchId && shown.current.match !== matchId) {
      shown.current.match = matchId;
      router.dismissTo('/');
      router.push('/match');
    }
  }, [matchId]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="go-available"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="person/[id]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen name="waiting" options={{ presentation: 'modal' }} />
      <Stack.Screen name="incoming" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="match" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile' }} />
      <Stack.Screen name="blocked" options={{ headerShown: true, title: 'Blocked people' }} />
    </Stack>
  );
}
