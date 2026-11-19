import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Starts as "reduced" (static) and turns animation on only after the first read says it is allowed.
 * Follows later changes without a restart.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
