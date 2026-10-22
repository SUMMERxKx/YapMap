import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { useGuardedPress } from '@/components/ui/press-feedback';

type Props = {
  onPress: () => void;
  live?: boolean; // red while live; tapping again gets you off
  timeLeft?: string; // e.g. "47 min left"
  size?: number;
};

/** The one main action. Green "YAP" to go live; red while you're live, tap again to get off. */
export function HeroButton({ onPress, live = false, timeLeft, size = 230 }: Props) {
  const { colors, elevation } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const green = colors.green;
  const red = colors.destructive;

  // 0 = green (not live), 1 = red (live), animated so the change feels smooth.
  const liveness = useDerivedValue(() => {
    let target = 0;
    if (live) {
      target = 1;
    }
    if (reduceMotion) {
      return target;
    }
    return withTiming(target, { duration: 400, easing: Easing.inOut(Easing.quad) });
  });

  useEffect(() => {
    if (reduceMotion) return;
    // The ring pulses faster while you're live.
    let pulseDuration = 2400;
    if (live) {
      pulseDuration = 1600;
    }
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: pulseDuration, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse, reduceMotion, live]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.22 }],
    backgroundColor: interpolateColor(liveness.value, [0, 1], [green, red]),
  }));

  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(liveness.value, [0, 1], [green, red]),
  }));

  let textColor = colors.onGreen;
  let accessibilityLabel = 'YAP. Go live';
  let accessibilityHint = 'Choose how long you want people nearby to see you';
  let hapticStyle = Haptics.ImpactFeedbackStyle.Heavy;
  if (live) {
    textColor = colors.onDestructive;
    accessibilityLabel = `You're live, ${timeLeft ?? ''}. Get off`;
    accessibilityHint = 'Stops showing you to people nearby';
    hapticStyle = Haptics.ImpactFeedbackStyle.Light;
  }

  let content;
  if (live) {
    content = (
      <>
        <AppText style={[styles.word, { color: textColor, fontSize: 48, lineHeight: 54 }]} maxFontSizeMultiplier={1.2}>
          LIVE
        </AppText>
        <AppText variant="bodyStrong" style={{ color: textColor }} maxFontSizeMultiplier={1.3}>
          {timeLeft}
        </AppText>
        <AppText variant="caption" style={{ color: textColor }} maxFontSizeMultiplier={1.3}>
          Tap to get off
        </AppText>
      </>
    );
  } else {
    content = (
      <AppText style={[styles.word, { color: textColor }]} maxFontSizeMultiplier={1.2}>
        YAP
      </AppText>
    );
  }

  // A double tap doesn't get you off and straight back into the go-live sheet.
  const guarded = useGuardedPress(() => {
    Haptics.impactAsync(hapticStyle);
    onPress();
  });

  const buttonStyle = ({ pressed }: { pressed: boolean }) => {
    let scale = 1;
    if (pressed) {
      scale = 0.97;
    }
    return [styles.button, { borderRadius: size / 2, transform: [{ scale }] }, pressed && styles.pressed];
  };

  return (
    <View style={[styles.wrap, { width: size * 1.3, height: size * 1.3 }]}>
      {!reduceMotion && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ring]}
        />
      )}
      <Animated.View style={[elevation.floating, { width: size, height: size, borderRadius: size / 2 }, fill]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          onPress={guarded.onPress}
          style={buttonStyle}>
          {content}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  pressed: { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
  word: { fontSize: 64, lineHeight: 72, fontWeight: '900', letterSpacing: 2 },
});
