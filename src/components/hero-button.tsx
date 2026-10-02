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

type Props = { onPress: () => void; size?: number };

/** The one main action: a big green "I'm up for a chat" button with a gentle pulse. */
export function HeroButton({ onPress, size = 220 }: Props) {
  const { colors, elevation } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.22 }],
  }));

  return (
    <View style={[styles.wrap, { width: size * 1.3, height: size * 1.3 }]}>
      {reduceMotion ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.green },
            ring,
          ]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="I'm up for a chat"
        accessibilityHint="Choose how long you want to be visible to people nearby"
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
        <Ionicons name="cafe-outline" size={40} color={colors.onGreen} />
        <AppText variant="heading" align="center" style={{ color: colors.onGreen, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>
          {"I'm up for\na chat"}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  button: { alignItems: 'center', justifyContent: 'center', gap: 8 },
});
