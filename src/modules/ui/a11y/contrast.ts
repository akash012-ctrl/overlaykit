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

/** Text/background pairs used by the camera UI. Bars are checked over a white worst case (bright light, L1). */
export const COLOR_PAIRS: readonly { readonly name: string; readonly text: Rgb; readonly background: Rgb }[] = [
  { name: 'bar text on top and bottom bar over white', text: WHITE, background: over([11, 15, 20], 0.88, WHITE) },
  { name: 'guide panel text over white', text: WHITE, background: over([11, 15, 20], 0.92, WHITE) },
  { name: 'guide note on panel over white', text: [207, 216, 220], background: over([11, 15, 20], 0.92, WHITE) },
  { name: 'button text on primary blue', text: WHITE, background: [21, 101, 192] },
  { name: 'button text on secondary grey', text: WHITE, background: [55, 71, 79] },
  { name: 'selected mode tab', text: WHITE, background: [21, 101, 192] },
  { name: 'mode tab', text: WHITE, background: [28, 37, 48] },
  { name: 'settings button text', text: WHITE, background: [28, 37, 48] },
  { name: 'privacy accept text on blue', text: WHITE, background: [47, 111, 235] },
  { name: 'destructive Stop text on guide panel over white', text: [255, 180, 171], background: over([11, 15, 20], 0.92, WHITE) },
  { name: 'Live banner text on red', text: WHITE, background: [127, 29, 29] },
  { name: 'settings hint on dark', text: [184, 194, 207], background: [11, 15, 20] },
];

export const MIN_TEXT_CONTRAST = 4.5;
