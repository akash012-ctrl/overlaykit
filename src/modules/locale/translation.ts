import type { LocaleCode, TranslationOutcome } from '../shared';

export type TranslationRequest = {
  readonly texts: readonly string[];
  /** Spec B may add explicit sources. */
  readonly source: 'auto';
  readonly target: LocaleCode;
};

/** Every translation engine sits behind this interface (architecture steering, Provider adapters). */
export interface TranslationProvider {
  readonly id: string;
  /** Exactly one outcome per input text, in input order. Never rejects (DD-10). */
  translate(request: TranslationRequest): Promise<readonly TranslationOutcome[]>;
}

const NOT_CONFIGURED: TranslationOutcome = Object.freeze({ ok: false, error: 'TR_NOT_CONFIGURED' });

/**
 * The only adapter in spec A (OQ-1, D-033). Returns TR_NOT_CONFIGURED for every
 * text and makes no network request (R17.2). It holds no API key and knows no
 * endpoint (R17.9, D-028).
 */
export const notConfiguredProvider: TranslationProvider = Object.freeze({
  id: 'not-configured',
  translate(request: TranslationRequest): Promise<readonly TranslationOutcome[]> {
    return Promise.resolve(request.texts.map(() => NOT_CONFIGURED));
  },
});

/** notConfiguredProvider in spec A (R17.1). */
export function getTranslationProvider(): TranslationProvider {
  return notConfiguredProvider;
}
