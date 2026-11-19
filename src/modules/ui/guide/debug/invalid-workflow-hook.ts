// OVERLAYKIT_DEBUG_ONLY. Required only inside `__DEV__` branches, so Metro drops this file from
// release bundles (R16.8, R11.8). Task 17.1 searches the release bundle for the marker above.
import type { MachineFixture } from '../../../components';
import { tm01Fixture } from '../../../components';
import type { GuideState, LoadResult } from '../../../guide';
import { loadWorkflow } from '../../../guide';

/** A workflow with no Steps, so the real loader returns GD_FIXTURE_INVALID (QE-2 on the phone). */
export function debugInvalidWorkflow(): LoadResult {
  const broken = {
    id: 'debug-invalid',
    title: { en: 'x', hi: 'x', kn: 'x' },
    steps: [],
    performed: { by: 'debug', on: 'debug', method: 'replica' },
    review: { hi: { status: 'unreviewed' }, kn: { status: 'unreviewed' } },
    authored: true,
  } as const;
  const fixture: MachineFixture = { ...tm01Fixture, workflows: [broken] };
  return loadWorkflow(fixture, 'debug-invalid');
}

/** Logs ids only: no OCR text, no image data (R11.8). */
export function logNewProof(state: GuideState): void {
  const p = state.proofs[state.proofs.length - 1];
  if (p === undefined) return;
  // eslint-disable-next-line no-console -- debug-only proof log, excluded from release bundles
  console.log(`OVERLAYKIT_DEBUG_ONLY guide proof #${p.ordinal} ${p.kind} ${p.fromStepId} -> ${p.toStepId ?? 'end'}`);
}
