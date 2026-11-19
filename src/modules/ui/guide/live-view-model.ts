import type { LiveConsent } from '../../locale';
import type { LiveKeyStore } from '../../planner';
import type { PlannerChoice } from '../../shared';

/** The version of the consent text on `LiveConsentScreen`. Change the text, raise this, and the user is asked again (R16.2). */
export const LIVE_CONSENT_VERSION = 1;

/** What ui needs from the Google key store (planner/live-key-store.ts). ui never reads the key back: it shows `masked()`. */
export type LiveKeyPort = Pick<LiveKeyStore, 'set' | 'remove' | 'masked'>;

/** Session as the banner sees it. Same three states the Live adapter reports while a socket exists. */
export type LiveBannerState = 'off' | 'connecting' | 'open';

export type LiveGateInput = {
  readonly plannerChoice: PlannerChoice;
  readonly consent: LiveConsent | null;
  readonly hasKey: boolean;
};

export function hasValidConsent(consent: LiveConsent | null): boolean {
  return consent !== null && consent.version === LIVE_CONSENT_VERSION;
}

/** Why Start is refused, or null when it may run. Order: choice, consent, key (R15.4, R16.4). */
export type LiveStartBlock = 'notChosen' | 'needConsent' | 'needKey';

export function liveStartBlock(input: LiveGateInput): LiveStartBlock | null {
  if (input.plannerChoice !== 'gemini-live') return 'notChosen';
  if (!hasValidConsent(input.consent)) return 'needConsent';
  if (!input.hasKey) return 'needKey';
  return null;
}

export type SendGateInput = LiveGateInput & {
  /** Banner state. The user pressed Start (the only way it leaves 'off'). */
  readonly session: LiveBannerState;
  readonly foreground: boolean;
};

/**
 * The send gate (R16.5): frames and audio may reach the adapter only while ALL hold:
 * consent accepted, Gemini Live chosen, a key saved, the user pressed Start (session not off),
 * and the app is in the foreground. Everything else sends nothing.
 */
export function liveSendAllowed(input: SendGateInput): boolean {
  return liveStartBlock(input) === null && input.session !== 'off' && input.foreground;
}

export type PlannerSelection =
  | { readonly kind: 'set'; readonly choice: PlannerChoice }
  | { readonly kind: 'open-key' }
  | { readonly kind: 'open-consent' };

/** What tapping a planner row does. Gemini Live is never selected without consent and a key (R15.4). */
export function resolvePlannerSelection(want: PlannerChoice, input: Omit<LiveGateInput, 'plannerChoice'>): PlannerSelection {
  if (want === 'on-device') return { kind: 'set', choice: 'on-device' };
  if (!input.hasKey) return { kind: 'open-key' };
  if (!hasValidConsent(input.consent)) return { kind: 'open-consent' };
  return { kind: 'set', choice: 'gemini-live' };
}

/** Pasted text with stray spaces and line breaks removed. A key has none. */
export function cleanKeyInput(raw: string): string {
  return raw.replace(/\s+/g, '');
}
