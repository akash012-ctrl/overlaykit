import type { StringKey } from '../../locale';
import type { TrErrorCode } from '../../shared';

export type FailedMarker = {
  readonly key: StringKey;
  readonly control: 'none' | 'retry' | 'auto-retry' | 'open-settings';
};

/**
 * Every TR_* code, plus the privacy gate, mapped to its failed-label marker and control
 * (ARCHITECTURE.md 8, R9.10). A total Record: a new code without an entry fails the type check.
 */
export const TR_UI: Readonly<Record<TrErrorCode | 'PRIVACY_NOT_ACKNOWLEDGED', FailedMarker>> = {
  TR_NOT_CONFIGURED: { key: 'label.notAvailable', control: 'none' },
  PRIVACY_NOT_ACKNOWLEDGED: { key: 'label.notAvailable', control: 'none' },
  TR_OFFLINE: { key: 'tr.offline', control: 'auto-retry' },
  TR_TIMEOUT: { key: 'tr.timeout', control: 'retry' },
  TR_RATE_LIMITED: { key: 'tr.rateLimited', control: 'retry' },
  TR_PROVIDER_ERROR: { key: 'tr.providerError', control: 'retry' },
  TR_UNSUPPORTED_PAIR: { key: 'tr.unsupportedPair', control: 'none' },
  TR_KEY_INVALID: { key: 'tr.keyInvalid', control: 'open-settings' },
  TR_NO_CREDITS: { key: 'tr.noCredits', control: 'open-settings' },
};
