// The Yap cat: one drawing for each moment the app has nothing (or nobody) to show yet.
// The drawings live in assets/mascot/*.svg; `npm run mascot` turns them into mascot-art.ts.
//
//   dizzy     - nobody nearby, or not live yet
//   waiting   - waiting for someone to answer a say-hi
//   searching - no events in range, or the person has gone
//   sleepy    - offline, or Yap couldn't load
//   happy     - a request was accepted and you're about to meet

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { MASCOT_ART } from '@/components/mascot/mascot-art';

export type MascotPose = keyof typeof MASCOT_ART;

type Props = {
  pose: MascotPose;
  size?: number;
  // What a screen reader says. Leave it out when the text next to the cat already says it all,
  // and the drawing is treated as decoration.
  label?: string;
};

// A slow, small loop per pose: `rotate` sways (in degrees), `lift` bobs up (in points).
const MOTION: Record<MascotPose, { rotate: number; lift: number; duration: number }> = {
  dizzy: { rotate: 4, lift: 0, duration: 1400 },
  waiting: { rotate: 0, lift: 4, duration: 1100 },
  searching: { rotate: 2, lift: 0, duration: 1800 },
  sleepy: { rotate: 0, lift: 2, duration: 2200 },
  happy: { rotate: 0, lift: 5, duration: 700 },
};

export function Mascot({ pose, size = 160, label }: Props) {
  const reduceMotion = useReducedMotion();
  const motion = MOTION[pose];
  // 0 is standing still; it swings between -1 and 1 for as long as the cat is on screen.
  const swing = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(swing);
      swing.value = 0;
      return;
    }
    const easing = Easing.inOut(Easing.sin);
    // Ease out to one side first, so the loop starts without a jump.
    swing.value = withSequence(
      withTiming(-1, { duration: motion.duration / 2, easing }),
      withRepeat(withTiming(1, { duration: motion.duration, easing }), -1, true),
    );
    return () => cancelAnimation(swing);
  }, [swing, reduceMotion, motion.duration]);

  const moving = useAnimatedStyle(() => ({
    transform: [{ translateY: motion.lift * swing.value }, { rotate: `${motion.rotate * swing.value}deg` }],
  }));

  let a11y;
  if (label) {
    a11y = { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label };
  } else {
    a11y = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  }

  return (
    <Animated.View {...a11y} style={[styles.box, { width: size, height: size }, moving]}>
      <SvgXml xml={MASCOT_ART[pose]} width={size} height={size} />
    </Animated.View>
  );
}

// The cat sways and bobs from its feet, not from its middle.
const styles = StyleSheet.create({ box: { transformOrigin: 'bottom' } });
