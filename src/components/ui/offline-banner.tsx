import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkState } from 'expo-network';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

/** Global, non-blocking banner shown at the top whenever the phone is offline. */
export function OfflineBanner() {
  const { isInternetReachable, isConnected } = useNetworkState();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: insets.top + spacing.xs,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.warningSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.warningText} />
      <AppText variant="caption" color="warningText" style={{ flex: 1 }}>
        No internet connection. Trying to reconnect.
      </AppText>
    </View>
  );
}
