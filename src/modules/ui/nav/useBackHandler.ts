import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

import type { BackAction } from './back';

/**
 * Registers the hardware back handler only while this screen has focus, so Settings on top
 * keeps the router's own back. `handle` returns the action to take; 'system' falls through.
 */
export function useBackHandler(resolve: () => BackAction, run: (action: Exclude<BackAction, 'system'>) => void): void {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const action = resolve();
        if (action === 'system') return false;
        run(action);
        return true;
      });
      return () => sub.remove();
    }, [resolve, run]),
  );
}
