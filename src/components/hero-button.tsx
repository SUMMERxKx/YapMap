import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = {
  onPress: () => void;
  live?: boolean; // when live, the button shows the status and pressing it again ends it
  timeLeft?: string; // e.g. "47 min left"
  size?: number;
};

/** The one main action. Green "I'm up for a chat"; once live, the same button shows you're live. */
export function HeroButton({ onPress, live, timeLeft, size = 230 }: Props) {
  const { colors, elevation } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: live ? 1600 : 2400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse, reduceMotion, live]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.22 }],
  }));

  return (
    <View style={[styles.wrap, { width: size * 1.3, height: size * 1.3 }]}>
      {reduceMotion ? null : (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.green }, ring]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={live ? `You're live, ${timeLeft ?? ''}` : "I'm up for a chat"}
        accessibilityHint={
          live ? 'Double tap to get off and stop being visible' : 'Choose how long you want to be visible to people nearby'
        }
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          elevation.floating,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pressed ? colors.greenPressed : colors.green,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}>
        {live ? (
          <>
            <AppText variant="label" style={{ color: colors.onGreen }}>
              {"YOU'RE LIVE"}
            </AppText>
            <AppText align="center" style={[styles.big, { color: colors.onGreen }]}>
              {timeLeft}
            </AppText>
            <AppText variant="caption" style={{ color: colors.onGreen }}>
              Tap to get off
            </AppText>
          </>
        ) : (
          <>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.onGreen} />
            <AppText align="center" style={[styles.big, { color: colors.onGreen }]}>
              {"I'm up for\na chat"}
            </AppText>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  button: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  big: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
});
