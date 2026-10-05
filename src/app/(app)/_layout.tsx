import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { NearbyToast } from '@/components/live/nearby-toast';
import { useNearbyAlerts } from '@/hooks/use-nearby-alerts';
import { goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  const incomingId = useStore((s) => s.incoming?.id);
  const chatId = useStore((s) => s.chat?.id);
  const expiresAt = useStore((s) => s.availability?.expiresAt);
  const seenTutorial = useStore((s) => s.seenTutorial);
  const shown = useRef<{ incoming?: string; chat?: string }>({});

  // While live: "someone is near you" prompts.
  useNearbyAlerts();

  // First time in the app: show how it works.
  useEffect(() => {
    if (!seenTutorial) router.push('/tutorial');
  }, [seenTutorial]);

  // Availability ends on time whichever screen is open.
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => goOffline('expired'), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  // An incoming request or a newly opened chat takes over the screen, wherever the user is.
  // When push notifications are added, tapping one opens these same routes.
  useEffect(() => {
    if (incomingId && shown.current.incoming !== incomingId) {
      shown.current.incoming = incomingId;
      router.push('/incoming');
    }
  }, [incomingId]);

  useEffect(() => {
    if (chatId && shown.current.chat !== chatId) {
      shown.current.chat = chatId;
      router.dismissTo('/');
      router.push('/chat');
    }
  }, [chatId]);

  return (
    <View style={{ flex: 1 }}>
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
        <Stack.Screen
          name="event/new"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.75],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="tutorial" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="waiting" options={{ presentation: 'modal' }} />
        <Stack.Screen name="incoming" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        {/* A normal pushed screen: the back gesture works, and the status bar inset is
            handled like everywhere else (the old full-screen modal hid the header behind
            the notch on some iPhones). Leaving doesn't end the chat; the ActiveChatBar
            on Go live and Nearby reopens it. */}
        <Stack.Screen name="chat" />
        <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile' }} />
        <Stack.Screen name="blocked" options={{ headerShown: true, title: 'Blocked people' }} />
      </Stack>
      <NearbyToast />
    </View>
  );
}
