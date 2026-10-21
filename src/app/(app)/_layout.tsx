import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { NearbyToast } from '@/components/live/nearby-toast';
import { useNearbyPolling } from '@/hooks/use-nearby';
import { useNearbyAlerts } from '@/hooks/use-nearby-alerts';
import { goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  const incomingId = useStore((state) => state.incoming?.id);
  const chatId = useStore((state) => state.chat?.id);
  const expiresAt = useStore((state) => state.availability?.expiresAt);
  const live = useStore((state) => state.availability !== null);
  const seenTutorial = useStore((state) => state.seenTutorial);
  // The request and chat ids already shown, so each one only takes over the screen once.
  const shown = useRef<{ incoming?: string; chat?: string }>({});

  // While live: one shared nearby list, and "someone is near you" prompts from it.
  useNearbyPolling();
  useNearbyAlerts();

  // First time in the app: show how it works.
  useEffect(() => {
    if (!seenTutorial) router.push('/tutorial');
  }, [seenTutorial]);

  // Availability ends on time whichever screen is open.
  useEffect(() => {
    if (!expiresAt) return;
    const msUntilExpiry = Math.max(0, expiresAt - Date.now());
    const timer = setTimeout(() => goOffline('expired'), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  // An incoming request or a newly opened chat takes over the screen, wherever the user is.
  // When push notifications are added, tapping one opens these same routes.
  useEffect(() => {
    if (!incomingId) return;
    if (shown.current.incoming === incomingId) return;
    shown.current.incoming = incomingId;
    router.push('/incoming');
  }, [incomingId]);

  useEffect(() => {
    if (!chatId) return;
    if (shown.current.chat === chatId) return;
    shown.current.chat = chatId;
    router.dismissTo('/');
    router.push('/chat');
  }, [chatId]);

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
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
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="password" />
      </Stack>
      <NearbyToast />
      {live && <KeepScreenOn />}
    </View>
  );
}

/**
 * Keeps the screen on while it's shown. Without push notifications a say-hi only arrives
 * while Yap is open, so it stays awake while you're live.
 */
function KeepScreenOn() {
  useKeepAwake('yap-live');
  return null;
}
