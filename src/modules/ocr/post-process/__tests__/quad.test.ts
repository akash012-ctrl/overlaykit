import type { RawOcrLine } from '../..';
import { buildQuad, validateQuad } from '../quad';

// Hand-built raw lines (task 5.1). No recorded OCR snapshot exists yet; task
// 15.2 re-runs these checks on recorded snapshots.

function raw(fields: Partial<RawOcrLine>): RawOcrLine {
  return { text: 'TICKETS', corners: null, box: null, confidence: null, language: null, ...fields };
}

const CORNERS = [
  { x: 100, y: 200 },
  { x: 400, y: 210 },
  { x: 398, y: 260 },
  { x: 98, y: 250 },
];

describe('buildQuad', () => {
  it('uses four corners in the order given', () => {
    expect(buildQuad(raw({ corners: CORNERS, box: { left: 0, top: 0, right: 1, bottom: 1 } }))).toEqual(CORNERS);
  });

  it('falls back to the box corners when there are no corners', () => {
    expect(buildQuad(raw({ box: { left: 10, top: 20, right: 110, bottom: 60 } }))).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 60 },
      { x: 10, y: 60 },
    ]);
  });

  it('falls back to the box when the engine gave a corner count other than four', () => {
    const quad = buildQuad(raw({ corners: CORNERS.slice(0, 3), box: { left: 10, top: 20, right: 110, bottom: 60 } }));
    expect(quad?.[0]).toEqual({ x: 10, y: 20 });
  });

  it('is null with neither corners nor a box', () => {
    expect(buildQuad(raw({}))).toBeNull();
    expect(buildQuad(raw({ corners: [] }))).toBeNull();
  });
});

describe('validateQuad', () => {
  // A tolerance chosen for this test only. ZERO_AREA_EPSILON_PX2 is created in
  // ocr/thresholds.ts with task 15.
  const EPSILON = 1e-3;

  it('accepts a normal line', () => {
    expect(validateQuad(buildQuad(raw({ corners: CORNERS })), EPSILON)).toBe('ok');
  });

  it('reports a missing quad', () => {
    expect(validateQuad(null, EPSILON)).toBe('missing');
  });

  it.each([
    ['NaN', Number.NaN],
    ['+Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('reports a corner coordinate of %s as non-finite', (_label, value) => {
    const corners = CORNERS.map((p, i) => (i === 2 ? { x: p.x, y: value } : p));
    expect(validateQuad(buildQuad(raw({ corners })), EPSILON)).toBe('non-finite');
  });

  it('reports corners on one straight line as zero-area', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 100 },
      { x: 300, y: 150 },
    ];
    expect(validateQuad(buildQuad(raw({ corners })), EPSILON)).toBe('zero-area');
  });

  it('reports four corners at one point as zero-area', () => {
    const p = { x: 42, y: 7 };
    expect(validateQuad(buildQuad(raw({ corners: [p, p, p, p] })), EPSILON)).toBe('zero-area');
  });

  it('treats an area at the tolerance as zero and an area just above it as valid', () => {
    // A 1 px wide box whose height sets the area exactly.
    const boxWithArea = (area: number) => buildQuad(raw({ box: { left: 0, top: 0, right: 1, bottom: area } }));
    expect(validateQuad(boxWithArea(EPSILON), EPSILON)).toBe('zero-area');
    expect(validateQuad(boxWithArea(EPSILON * 2), EPSILON)).toBe('ok');
  });
});
