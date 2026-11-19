import type { Result, TrErrorCode, TranslationOutcome } from '../shared';

/** One call per language pair: if every outcome failed with the same code, the whole call failed. */
export function collapseUniformFailure(
  outcomes: readonly TranslationOutcome[],
): Result<readonly TranslationOutcome[], TrErrorCode> {
  const first = outcomes[0];
  if (first && !first.ok && outcomes.every((o) => !o.ok && o.error === first.error)) {
    return { ok: false, error: first.error };
  }
  return { ok: true, value: outcomes };
}
