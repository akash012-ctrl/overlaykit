// The only file that imports react-native-reanimated (D-052, lint VENDOR_OWNERS).
// Motion explains a change of place or state; every animation has a static path under reduced motion.
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { motion } from '../theme';

const curve = (c: readonly [number, number, number, number]) => Easing.bezier(c[0], c[1], c[2], c[3]);
const { duration, easing } = motion;

/** Panels: fade in with a 12 dp rise, fade out faster. */
const ENTER = FadeInDown.duration(duration.enter)
  .easing(curve(easing.decelerate))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
  .reduceMotion(ReduceMotion.System);
const EXIT = FadeOut.duration(duration.exit).reduceMotion(ReduceMotion.System);
/** Live labels: slide to the text's new place on each refresh instead of blinking. */
const GLIDE = LinearTransition.duration(duration.glide).easing(curve(easing.standard)).reduceMotion(ReduceMotion.System);
const APPEAR = FadeIn.duration(duration.state).reduceMotion(ReduceMotion.System);

type Props = { readonly children?: ReactNode; readonly style?: StyleProp<ViewStyle> };

export function FadeInView({ children, style }: Props) {
  return (
    <Animated.View entering={ENTER} exiting={EXIT} style={style}>
      {children}
    </Animated.View>
  );
}

/** An absolutely positioned mark that glides when its position changes (live labels, the Guide target). */
export function GlideView({ children, style, pointerEvents }: Props & { readonly pointerEvents?: 'box-none' | 'none' | 'auto' }) {
  return (
    <Animated.View layout={GLIDE} entering={APPEAR} exiting={EXIT} pointerEvents={pointerEvents} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Breathes while `active`: opacity 1 to 0.55 (the Guide target ring) or scale 1 to 1.08 (the listening mic).
 * Static when reduced motion is on, which is also the state before the setting is read.
 */
export function PulseView({ children, style, active = true, kind = 'opacity' }: Props & { readonly active?: boolean; readonly kind?: 'opacity' | 'scale' }) {
  const reduced = useReduceMotion();
  const t = useSharedValue(0);
  const on = active && !reduced;
  useEffect(() => {
    if (!on) {
      cancelAnimation(t);
      t.set(0);
      return undefined;
    }
    const half = { duration: 900, easing: curve(easing.standard) };
    t.set(withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1));
    return () => cancelAnimation(t);
  }, [on, t]);
  const animated = useAnimatedStyle(() =>
    kind === 'scale' ? { transform: [{ scale: 1 + 0.08 * t.get() }] } : { opacity: 1 - 0.45 * t.get() },
  );
  return (
    <Animated.View pointerEvents="box-none" style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
