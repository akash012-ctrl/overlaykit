/**
 * One normalization for grounding and expectation, so both match the same way (R5.1):
 * Unicode NFC, case-fold, trim, whitespace collapsed to one space.
 * shortcut: toLowerCase is not full Unicode case-folding (for example German sharp s); fine for
 * English and Devanagari, revisit if a measured miss shows up.
 */
export function normalizeText(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}
