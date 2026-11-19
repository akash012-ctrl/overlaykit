// WCAG 2.x contrast ratio for opaque sRGB colours written as #RRGGBB.
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance, 0 for black and 1 for white. NaN for anything that isn't #RRGGBB. */
export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match) return Number.NaN;
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => channelToLinear(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** From 1 (same colour) to 21 (black on white). The order of the two colours doesn't matter. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
