export type BatchLimits = { readonly maxStringsPerRequest: number; readonly maxCharsPerRequest: number };

/**
 * Splits item indexes into batches within both caps, in input order.
 * An item longer than the character cap can never fit and is returned in `tooLong`.
 */
export function splitBatches(
  texts: readonly string[],
  limits: BatchLimits,
): { readonly batches: readonly (readonly number[])[]; readonly tooLong: readonly number[] } {
  const batches: number[][] = [];
  const tooLong: number[] = [];
  let current: number[] = [];
  let chars = 0;
  texts.forEach((text, index) => {
    if (text.length > limits.maxCharsPerRequest) {
      tooLong.push(index);
      return;
    }
    if (current.length > 0 && (current.length >= limits.maxStringsPerRequest || chars + text.length > limits.maxCharsPerRequest)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(index);
    chars += text.length;
  });
  if (current.length > 0) batches.push(current);
  return { batches, tooLong };
}
