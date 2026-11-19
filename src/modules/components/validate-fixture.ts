import type { LocaleCode, Point } from '../shared';
import { quadSignedArea } from '../shared';
import type { FixtureIssue, MachineFixture, MachineFixtureB } from './fixture-types';

const LOCALES: readonly LocaleCode[] = ['en', 'hi', 'kn'];

const finitePoint = (p: Point | undefined): boolean =>
  p !== undefined && Number.isFinite(p.x) && Number.isFinite(p.y);

const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';

/** Pure. Reports every issue, not the first (R17.6). */
export function validateFixture(fixture: MachineFixtureB | MachineFixture): readonly FixtureIssue[] {
  const issues: FixtureIssue[] = [];
  const { identification, components } = fixture;

  if (identification.anchors.length < 2) issues.push({ rule: 'TOO_FEW_ANCHORS', path: 'identification.anchors' });
  identification.anchors.forEach((a, i) => {
    if (blank(a.text)) issues.push({ rule: 'EMPTY_ANCHOR_TEXT', path: `identification.anchors[${i}].text` });
    if (!finitePoint(a.pos)) issues.push({ rule: 'NON_FINITE_POSITION', path: `identification.anchors[${i}].pos` });
  });

  const { minAnchors, minScore } = identification;
  if (!Number.isFinite(minAnchors) || minAnchors < 2) {
    issues.push({ rule: 'BAD_THRESHOLD', path: 'identification.minAnchors' });
  }
  if (!Number.isFinite(minScore) || minScore <= 0 || minScore > 1) {
    issues.push({ rule: 'BAD_THRESHOLD', path: 'identification.minScore' });
  }

  const seen = new Set<string>();
  components.forEach((c, i) => {
    if (seen.has(c.id)) issues.push({ rule: 'DUPLICATE_COMPONENT_ID', path: `components[${i}].id` });
    seen.add(c.id);
    if (!c.region.every(finitePoint)) {
      issues.push({ rule: 'NON_FINITE_POSITION', path: `components[${i}].region` });
    } else if (!(Math.abs(quadSignedArea(c.region)) > 0)) {
      issues.push({ rule: 'BAD_REGION', path: `components[${i}].region` });
    }
    for (const locale of LOCALES) {
      if (blank(c.name?.[locale])) issues.push({ rule: 'MISSING_LOCALE', path: `components[${i}].name.${locale}` });
      if (blank(c.explanation?.[locale])) {
        issues.push({ rule: 'MISSING_LOCALE', path: `components[${i}].explanation.${locale}` });
      }
    }
  });

  for (const locale of ['hi', 'kn'] as const) {
    const review = (fixture.review as Partial<MachineFixtureB['review']> | undefined)?.[locale];
    const ok =
      review === 'unreviewed' ||
      (typeof review === 'object' && review !== null && !blank(review.reviewer) && !blank(review.reviewedOn));
    if (!ok) issues.push({ rule: 'EMPTY_REVIEW', path: `review.${locale}` });
  }
  return issues;
}

