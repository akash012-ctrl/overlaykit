import type { CmpErrorCode, LocatedComponent, MachineMatch, OcrResult } from '../shared';
import { applyFit, classifyVisibility } from '../geometry';
import type { MachineFixtureB } from './fixture-types';

export type LocateResult = {
  readonly located: readonly LocatedComponent[];
  readonly notVisible: readonly { readonly componentId: string; readonly code: CmpErrorCode }[];
};

/** Empty lists unless the match is `verified` (R20.4). Non-finite results are omitted silently (R20.8). */
export function locateComponents(fixture: MachineFixtureB, match: MachineMatch, ocr: OcrResult): LocateResult {
  if (match.status !== 'verified') return { located: [], notVisible: [] };
  const frame = { x: 0, y: 0, width: ocr.imageSize.width, height: ocr.imageSize.height };
  const located: LocatedComponent[] = [];
  const notVisible: { componentId: string; code: CmpErrorCode }[] = [];
  for (const c of fixture.components) {
    const quad = applyFit(match.fit, c.region);
    if (!quad.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) continue;
    if (classifyVisibility(quad, frame) === 'off-screen') {
      notVisible.push({ componentId: c.id, code: 'CMP_NOT_VISIBLE' });
    } else {
      located.push({ id: c.id, kind: c.kind, frameId: ocr.frameId, quad });
    }
  }
  return { located, notVisible };
}
