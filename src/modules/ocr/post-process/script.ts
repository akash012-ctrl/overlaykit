import type { Script } from '../../shared';

// Script classification by explicit Unicode code-point ranges (DD-12), not
// \p{Script=…} regex escapes, so it doesn't depend on Hermes regex support.
// The table is in design.md, section "ocr", "Script classification".

type Range = readonly [number, number];

const WHITESPACE: readonly Range[] = [
  [0x0009, 0x000d],
  [0x0020, 0x0020],
  [0x0085, 0x0085],
  [0x00a0, 0x00a0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];

/** Neutral code points other than whitespace. Checked before Latin, so U+00D7 and U+00F7 are neutral. */
const NEUTRAL: readonly Range[] = [
  [0x0021, 0x0040],
  [0x005b, 0x0060],
  [0x007b, 0x007e],
  [0x00a0, 0x00bf],
  [0x00d7, 0x00d7],
  [0x00f7, 0x00f7],
  [0x2000, 0x206f],
  [0x20a0, 0x20cf],
  [0x2190, 0x21ff],
];

const LATIN_LETTER: readonly Range[] = [
  [0x0041, 0x005a],
  [0x0061, 0x007a],
  [0x00c0, 0x024f],
  [0x1e00, 0x1eff],
];

/** Includes the danda and the Devanagari digits U+0966 to U+096F. */
const DEVANAGARI: readonly Range[] = [
  [0x0900, 0x097f],
  [0xa8e0, 0xa8ff],
  [0x1cd0, 0x1cff],
];

const ASCII_DIGIT: Range = [0x0030, 0x0039];

function inRanges(codePoint: number, ranges: readonly Range[]): boolean {
  return ranges.some(([low, high]) => codePoint >= low && codePoint <= high);
}

export type ScriptCounts = {
  readonly latin: number;
  readonly devanagari: number;
  /** Neutral code points that are not whitespace (punctuation, ASCII digits, currency, arrows). */
  readonly neutral: number;
  readonly whitespace: number;
  /** Every other code point, for example Kannada U+0C80 to U+0CFF. */
  readonly other: number;
  readonly asciiDigits: number;
};

/** Counts the text's code points (not UTF-16 units) per class. */
export function countScriptClasses(text: string): ScriptCounts {
  let latin = 0;
  let devanagari = 0;
  let neutral = 0;
  let whitespace = 0;
  let other = 0;
  let asciiDigits = 0;
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (inRanges(codePoint, WHITESPACE)) {
      whitespace += 1;
    } else if (inRanges(codePoint, NEUTRAL)) {
      neutral += 1;
      if (codePoint >= ASCII_DIGIT[0] && codePoint <= ASCII_DIGIT[1]) asciiDigits += 1;
    } else if (inRanges(codePoint, LATIN_LETTER)) {
      latin += 1;
    } else if (inRanges(codePoint, DEVANAGARI)) {
      devanagari += 1;
    } else {
      other += 1;
    }
  }
  return { latin, devanagari, neutral, whitespace, other, asciiDigits };
}

/** Code points that are not whitespace, by the table above. */
export function countNonWhitespace(text: string): number {
  const counts = countScriptClasses(text);
  return counts.latin + counts.devanagari + counts.neutral + counts.other;
}

/**
 * unsupported when "other" code points outnumber Latin plus Devanagari ones;
 * otherwise devanagari when Devanagari outnumbers Latin; otherwise latin.
 * Neutral-only text (for example "₹ 20") is latin, because the Latin model
 * reads ASCII digits and punctuation.
 */
export function classifyScript(text: string): Script {
  const { latin, devanagari, other } = countScriptClasses(text);
  if (other > latin + devanagari) return 'unsupported';
  if (devanagari > latin) return 'devanagari';
  return 'latin';
}
