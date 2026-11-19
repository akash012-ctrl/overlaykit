import type { LocaleCode, OcrLine, SourceLocale } from '../shared';

export type SendPlan =
  | { readonly kind: 'send'; readonly source: SourceLocale; readonly text: string }
  | {
      readonly kind: 'skip';
      readonly reason: 'unsupported-script' | 'same-language' | 'digit-sequence';
      readonly text: string | null;
    };

// ASCII, Devanagari (U+0966-096F) and Kannada (U+0CE6-0CEF) decimal digits.
const DIGIT = '[0-9\\u0966-\\u096F\\u0CE6-\\u0CEF]';

function hasDigitRun(text: string, min: number): boolean {
  if (!Number.isFinite(min) || min < 1) return false;
  return new RegExp(`${DIGIT}{${Math.floor(min)},}`).test(text);
}

/** Pure. One entry per input line, same order. Unsupported lines carry no text (spec A DD-3). */
export function planTranslation(lines: readonly OcrLine[], target: LocaleCode, digitRunMin: number): readonly SendPlan[] {
  return lines.map((line): SendPlan => {
    if (line.script === 'unsupported') return { kind: 'skip', reason: 'unsupported-script', text: null };
    const source: SourceLocale = line.script === 'devanagari' ? 'hi' : 'en';
    if (source === target) return { kind: 'skip', reason: 'same-language', text: line.text };
    if (hasDigitRun(line.text, digitRunMin)) return { kind: 'skip', reason: 'digit-sequence', text: line.text };
    return { kind: 'send', source, text: line.text };
  });
}
