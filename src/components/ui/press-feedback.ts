// Gentle press feedback shared by every tappable surface: while held it shrinks a little and
// takes its pressed colour, then eases back when let go. With reduced motion on, only the
// colour changes. Use it with AnimatedPressable:
//
//   const press = usePressFeedback(colors.surface, colors.surfaceMuted);
//   <AnimatedPressable onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={[box, press.style]} />
//
// useGuardedPress (below) makes a double tap act once; every tappable surface uses it too.

import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePressFeedback(color: string, pressedColor: string, pressedScale?: number) {
  const { motion } = useTheme();
  const reduceMotion = useReducedMotion();
  // 0 = resting, 1 = fully pressed.
  const pressed = useSharedValue(0);

  let scaleTo: number = pressedScale ?? motion.pressScale;
  if (reduceMotion) {
    scaleTo = 1;
  }

  const onPressIn = () => {
    pressed.value = withTiming(1, { duration: motion.pressInMs });
  };
  const onPressOut = () => {
    pressed.value = withTiming(0, { duration: motion.pressOutMs });
  };

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value, [0, 1], [color, pressedColor]),
    transform: [{ scale: 1 + (scaleTo - 1) * pressed.value }],
  }));

  return { onPressIn, onPressOut, style, pressed };
}

// After a tap that started nothing to wait for (opening a screen, going back), more taps are
// ignored for this long, so a double tap can't open a screen twice or go back two screens.
const REPEAT_TAP_MS = 500;

/**
 * Makes a double tap act once. While the async action a tap started is still running, more
 * taps are ignored and `busy` is true (a Button shows its spinner meanwhile); after a tap that
 * started nothing async, taps are ignored for half a second. Pass the async function itself
 * (`onPress={save}`, not `() => void save()`) so the wait can be seen.
 */
export function useGuardedPress(onPress: (() => unknown) | undefined) {
  const [busy, setBusy] = useState(false);
  const blocked = useRef(false);

  const guardedPress = () => {
    if (!onPress || blocked.current) return;
    blocked.current = true;
    let result: unknown;
    try {
      result = onPress();
    } catch (error) {
      blocked.current = false;
      throw error;
    }
    if (isPromise(result)) {
      setBusy(true);
      const release = () => {
        blocked.current = false;
        setBusy(false);
      };
      result.then(release, release);
    } else {
      setTimeout(() => {
        blocked.current = false;
      }, REPEAT_TAP_MS);
    }
  };

  return { onPress: guardedPress, busy };
}

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as Promise<unknown> | undefined)?.then === 'function';
}
