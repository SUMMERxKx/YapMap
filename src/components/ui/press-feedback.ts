// Gentle press feedback shared by every tappable surface: while held it shrinks a little and
// takes its pressed colour, then eases back when let go. With reduced motion on, only the
// colour changes. Use it with AnimatedPressable:
//
//   const press = usePressFeedback(colors.surface, colors.surfaceMuted);
//   <AnimatedPressable onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={[box, press.style]} />

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
