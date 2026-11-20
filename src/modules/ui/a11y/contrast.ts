import { colors } from '../theme';

/** WCAG 2.x relative luminance and contrast ratio. Pure. Colours are [r, g, b] 0..255. */
export type Rgb = readonly [number, number, number];

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Colour of a translucent layer over a backdrop. */
export function over(fg: Rgb, alpha: number, backdrop: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + backdrop[i] * (1 - alpha))) as unknown as Rgb;
}

const WHITE: Rgb = [255, 255, 255];

/** A token as RGB. Hex as is; rgba() composited over `backdrop` (white by default: bright light, L1). */
export function parseColor(color: string, backdrop: Rgb = WHITE): Rgb {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (hex) return [parseInt(hex[1] as string, 16), parseInt(hex[2] as string, 16), parseInt(hex[3] as string, 16)];
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  if (!rgba) throw new Error(`Unsupported colour ${color}`);
  return over([Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], Number(rgba[4]), backdrop);
}

const c = (token: keyof typeof colors): Rgb => parseColor(colors[token]);

/** Text and background pairs the UI uses, read from the tokens. Translucent backings are checked over white. */
export const COLOR_PAIRS: readonly { readonly name: string; readonly text: Rgb; readonly background: Rgb }[] = [
  { name: 'text on primary', text: c('text'), background: c('primary') },
  { name: 'text on surfaceRaised', text: c('text'), background: c('surfaceRaised') },
  { name: 'text on surfaceHigh', text: c('text'), background: c('surfaceHigh') },
  { name: 'text on primaryContainer', text: c('text'), background: c('primaryContainer') },
  { name: 'text on dangerContainer', text: c('text'), background: c('dangerContainer') },
  { name: 'text on surface', text: c('text'), background: c('surface') },
  { name: 'text on scrim over white', text: c('text'), background: c('scrim') },
  { name: 'text on panel over white', text: c('text'), background: c('panel') },
  { name: 'translation on lens chip over white', text: c('text'), background: c('lens') },
  { name: 'textMuted on surface', text: c('textMuted'), background: c('surface') },
  { name: 'textMuted on panel over white', text: c('textMuted'), background: c('panel') },
  { name: 'accentText on surface', text: c('accentText'), background: c('surface') },
  { name: 'accentText on surfaceRaised', text: c('accentText'), background: c('surfaceRaised') },
  { name: 'dangerText on panel over white', text: c('dangerText'), background: c('panel') },
  { name: 'dangerText on dangerContainer', text: c('dangerText'), background: c('dangerContainer') },
  { name: 'target label text on ringDark', text: c('target'), background: c('ringDark') },
];

export const MIN_TEXT_CONTRAST = 4.5;
