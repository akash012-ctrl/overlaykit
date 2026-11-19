import type { RouteTable } from '../../locale';
import type { Result, TrErrorCode } from '../../shared';

/**
 * No translate call before the user has seen the privacy note (R15.1, R15.2).
 * Until then every readable label is failed, shown as "Translation not available".
 * `run` is not called when the note is not acknowledged.
 */
export async function translateAfterAcknowledgement<T>(
  privacyAcknowledged: boolean,
  run: () => Promise<Result<T, TrErrorCode>>,
): Promise<Result<T, TrErrorCode>> {
  if (!privacyAcknowledged) return { ok: false, error: 'TR_NOT_CONFIGURED' };
  return run();
}

export type PrivacyBodyKey = 'privacy.body.cloud' | 'privacy.body.onDevice' | 'privacy.body.none';

/**
 * The note follows the route table: it names OpenRouter only when a cloud route exists, says text
 * stays on the phone when every configured pair is on-device, and says nothing is sent when no pair is set up.
 */
export function privacyBodyKey(routes: RouteTable): PrivacyBodyKey {
  const values = Object.values(routes);
  if (values.includes('cloud')) return 'privacy.body.cloud';
  if (values.includes('on-device')) return 'privacy.body.onDevice';
  return 'privacy.body.none';
}
