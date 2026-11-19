import { classifyScript, countNonWhitespace, countScriptClasses } from '../script';

// Example strings for the code-point classifier (design.md, Open design point 9).
// They test the Unicode table, not engine output.

describe('classifyScript', () => {
  it.each([
    ['English words', 'Buy ticket'],
    ['Latin with accents', 'Caf\u00e9 cr\u00e8me'],
    ['Latin Extended Additional', 'Vi\u1ec7t'],
    ['neutral characters only, read by the Latin model', '₹ 20'],
    ['ASCII digits and punctuation', '12:30 - 14:45'],
    ['more Latin than Devanagari (8 against 5)', 'Platform निकास'],
  ])('is latin for %s', (_label, text) => {
    expect(classifyScript(text)).toBe('latin');
  });

  it.each([
    ['Hindi words', 'टिकट खरीदें'],
    ['Hindi with a danda', 'कार्ड डालें।'],
    ['Devanagari digits', '२०'],
    ['Devanagari with a rupee sign and ASCII digits', '₹ 20 नकद'],
  ])('is devanagari for %s', (_label, text) => {
    expect(classifyScript(text)).toBe('devanagari');
  });

  it.each([
    ['Kannada words', 'ಟಿಕೆಟ್ ಖರೀದಿಸಿ'],
    ['Tamil', 'பயணச்சீட்டு'],
    ['Kannada with a few Latin letters', 'ಟಿಕೆಟ್ AB'],
    ['emoji', '🎫🎫'],
  ])('is unsupported for %s', (_label, text) => {
    expect(classifyScript(text)).toBe('unsupported');
  });

  // Ties follow design.md's "exceeds" wording. Whether a tie should count as
  // unsupported is an open owner question; these tests pin today's behaviour.
  it('is latin when "other" code points only equal the Latin count (tie, not exceeding)', () => {
    expect(countScriptClasses('ಟಿ AB')).toMatchObject({ other: 2, latin: 2 });
    expect(classifyScript('ಟಿ AB')).toBe('latin'); // tie
    expect(classifyScript('ಟಿಕ AB')).toBe('unsupported'); // other 3 against latin 2: exceeds
  });

  it('is latin when Devanagari only equals the Latin count (tie, not exceeding)', () => {
    expect(classifyScript('AB कख')).toBe('latin');
    expect(classifyScript('A कख')).toBe('devanagari');
  });

  it('treats U+00D7 (×) and U+00F7 (÷) as neutral, not Latin', () => {
    expect(countScriptClasses('×÷')).toMatchObject({ latin: 0, neutral: 2 });
  });

  it('counts code points, not UTF-16 units', () => {
    expect(countScriptClasses('🎫')).toMatchObject({ other: 1 });
  });

  it('counts ASCII digits as neutral and Devanagari digits as Devanagari', () => {
    expect(countScriptClasses('20 २०')).toEqual({
      latin: 0,
      devanagari: 2,
      neutral: 2,
      whitespace: 1,
      other: 0,
      asciiDigits: 2,
    });
  });
});

describe('classification after NFC normalization', () => {
  // Found by Property 12. postProcess classifies the NFC form, which can differ.
  it('counts क़ (U+0958) as one Devanagari code point, but its NFC form as two', () => {
    const text = 'ಟಿಕ\u0958';
    expect(classifyScript(text)).toBe('unsupported'); // other 3 against devanagari 1
    expect(text.normalize('NFC')).toBe('ಟಿಕ\u0915\u093c');
    expect(classifyScript(text.normalize('NFC'))).toBe('unsupported'); // other 3 against devanagari 2
    expect(classifyScript('ಟಿ\u0958')).toBe('unsupported'); // other 2 against devanagari 1
    expect(classifyScript('ಟಿ\u0958'.normalize('NFC'))).toBe('devanagari'); // other 2 no longer outnumbers devanagari 2
  });
});

describe('countNonWhitespace', () => {
  it('ignores spaces, tabs, no-break spaces and other whitespace', () => {
    expect(countNonWhitespace(' A\tB\u00a0C\u2003D\u3000')).toBe(4);
  });
});
