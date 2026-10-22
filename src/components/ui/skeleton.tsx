// Loading placeholders: grey shapes in the layout of the content that's on its way, gently
// pulsing, so the screen keeps its shape instead of showing a bare spinner.
//
//   <Skeleton>
//     <SkeletonBlock width={64} height={64} radius={18} />
//     <SkeletonBlock width="60%" height={14} />
//   </Skeleton>

import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

/** Wraps a group of SkeletonBlocks so they all pulse together (one animation, not one each). */
export function Skeleton({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.5, { duration: motion.skeletonPulseMs, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion, motion.skeletonPulseMs]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    // Screen readers hear "Loading" once, not every grey bar.
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel="Loading" style={[style, pulse]}>
      {children}
    </Animated.View>
  );
}

type BlockProps = {
  width: DimensionValue;
  height: number;
  radius?: number; // defaults to small rounded corners
  style?: ViewStyle;
};

/** One grey placeholder shape. */
export function SkeletonBlock({ width, height, radius, style }: BlockProps) {
  const { colors, radius: radii } = useTheme();
  return (
    <View
      style={[{ width, height, borderRadius: radius ?? radii.sm, backgroundColor: colors.surfaceMuted }, style]}
    />
  );
}
