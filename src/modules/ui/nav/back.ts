import type { Mode } from '../camera-screen/ModeSwitcher';

export type BackAction = 'leave-guide' | 'close-still' | 'system';

/**
 * Pure. What the Android back button does on the camera screen. Guide first (it unmounts and drops
 * its state, OQ-7), then a shown still, otherwise the system default. Settings is a pushed route,
 * so the router pops it and this handler is not registered while it is on top.
 */
export function resolveBack(ctx: { readonly mode: Mode; readonly stillShown: boolean }): BackAction {
  if (ctx.mode === 'guide') return 'leave-guide';
  if (ctx.stillShown) return 'close-still';
  return 'system';
}
