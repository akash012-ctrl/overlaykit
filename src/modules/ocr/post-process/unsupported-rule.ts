import type { ReadableScript } from '../../shared';
import { classifyScript, countScriptClasses } from './script';

/**
 * Values come from the G1a spike (OQ-5) and live in ocr/thresholds.ts once
 * recorded in docs/DECISIONS.md. The rule takes them as a parameter and has
 * no defaults, so no value is invented before then.
 */
export type UnsupportedScriptThresholds = {
  /**
   * The garble check counts only for lines below this confidence, when the
   * engine gives one. null: no confidence condition.
   */
  readonly maxLineConfidence: number | null;
  /** Symbol fraction at or above which a line looks garbled. null: sub-check off. */
  readonly minSymbolFraction: number | null;
  /** Minority-script fraction at or above which a line looks garbled. null: sub-check off. */
  readonly minMinorityScriptFraction: number | null;
  /** Primary language subtags whose script the engine can't read, for example "kn". */
  readonly languages: readonly string[];
};

export type UnsupportedLineInput = {
  /** NFC, trimmed, not empty. */
  readonly text: string;
  /** Normalized to 0..1, or undefined when the engine gave none. */
  readonly confidence: number | undefined;
  /** BCP-47 code from the engine, if any. */
  readonly language: string | null;
  readonly supportedScripts: readonly ReadableScript[];
};

/** "kn-IN" → "kn". */
function primarySubtag(language: string): string {
  return language.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/**
 * Symbols: code points that are neither Latin letters, Devanagari characters,
 * ASCII digits nor whitespace, as a fraction of the non-whitespace code points.
 */
export function symbolFraction(text: string): number {
  const c = countScriptClasses(text);
  const nonWhitespace = c.latin + c.devanagari + c.neutral + c.other;
  if (nonWhitespace === 0) return 0;
  const symbols = c.neutral - c.asciiDigits + c.other;
  return symbols / nonWhitespace;
}

/** The smaller of the Latin and Devanagari counts over their sum. 0 when the line has neither. */
export function minorityScriptFraction(text: string): number {
  const { latin, devanagari } = countScriptClasses(text);
  const letters = latin + devanagari;
  return letters === 0 ? 0 : Math.min(latin, devanagari) / letters;
}

/**
 * The Unsupported-script rule (R7.3, R7.4, R7.6). A line is unsupported when:
 * 1. classifyScript gives 'unsupported', or the classified script is not one
 *    the engine reads;
 * 2. the engine reported a language in `languages` ("und" or an unknown code
 *    decides nothing); or
 * 3. the line looks garbled (symbol fraction or minority-script fraction at or
 *    above its threshold) and, when the engine gives a confidence, that
 *    confidence is below `maxLineConfidence`.
 */
export function isUnsupportedLine(input: UnsupportedLineInput, t: UnsupportedScriptThresholds): boolean {
  const script = classifyScript(input.text);
  if (script === 'unsupported' || !input.supportedScripts.includes(script)) {
    return true;
  }

  if (input.language !== null) {
    const subtag = primarySubtag(input.language);
    if (t.languages.some((code) => primarySubtag(code) === subtag)) {
      return true;
    }
  }

  const garbled =
    (t.minSymbolFraction !== null && symbolFraction(input.text) >= t.minSymbolFraction) ||
    (t.minMinorityScriptFraction !== null && minorityScriptFraction(input.text) >= t.minMinorityScriptFraction);
  if (!garbled) return false;
  if (input.confidence !== undefined && t.maxLineConfidence !== null) {
    return input.confidence < t.maxLineConfidence;
  }
  return true;
}
