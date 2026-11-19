import type { LocalizedText, MachineFixture, WorkflowDef } from '../components';
import type { LoadResult } from './types';

const LOCALES = ['en', 'hi', 'kn'] as const;
const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';
const bad = (detail: string): LoadResult => ({
  ok: false,
  error: { code: 'GD_FIXTURE_INVALID', detail },
});

function missingLocale(text: LocalizedText | undefined, path: string): string | null {
  for (const l of LOCALES) if (blank(text?.[l])) return `${path}.${l}`;
  return null;
}

function check(fixture: MachineFixture, w: WorkflowDef, wi: number): string | null {
  const base = `workflows[${wi}]`;
  const steps = Array.isArray(w.steps) ? w.steps : [];
  if (steps.length === 0) return `${base}.steps`;
  const ids = new Set<string>();
  for (let i = 0; i < steps.length; i++) {
    const id = steps[i]?.id;
    if (blank(id) || ids.has(id as string)) return `${base}.steps[${i}].id`;
    ids.add(id as string);
  }
  const t = missingLocale(w.title, `${base}.title`);
  if (t) return t;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const a = missingLocale(s?.instruction, `${base}.steps[${i}].instruction`);
    if (a) return a;
    const b = missingLocale(s?.expectedResult, `${base}.steps[${i}].expectedResult`);
    if (b) return b;
  }
  for (const l of ['hi', 'kn'] as const) {
    const r = w.review?.[l];
    if (r?.status === 'unreviewed') continue;
    if (r?.status === 'reviewed' && !blank(r.reviewer) && !blank(r.reviewedOn)) continue;
    return `${base}.review.${l}`;
  }
  if (w.authored !== true) return `${base}.authored`;
  const p = w.performed;
  if (blank(p?.by)) return `${base}.performed.by`;
  if (blank(p?.on)) return `${base}.performed.on`;
  if (p.method !== 'on-site' && p.method !== 'replica') return `${base}.performed.method`;
  const comps = new Set(fixture.components.map((c) => c.id));
  const screens = new Set(fixture.screens.map((s) => s.id));
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!comps.has(s.targetComponentId)) return `${base}.steps[${i}].targetComponentId`;
    const cp = s.checkpoint;
    if (cp?.kind === 'text-visible') {
      if (blank(cp.text)) return `${base}.steps[${i}].checkpoint.text`;
      if (cp.screenId !== undefined && !screens.has(cp.screenId)) return `${base}.steps[${i}].checkpoint.screenId`;
    } else if (cp?.kind !== 'manual') {
      return `${base}.steps[${i}].checkpoint`;
    }
  }
  return null;
}

/** Pure. No clock, network or storage. Returns the first failing rule in design order. */
export function loadWorkflow(fixture: MachineFixture, workflowId: string): LoadResult {
  const wi = fixture.workflows.findIndex((w) => w.id === workflowId);
  const w = fixture.workflows[wi];
  if (w === undefined) return bad('workflowId');
  const failed = check(fixture, w, wi);
  if (failed !== null) return bad(failed);
  return { ok: true, value: { id: w.id, machineId: fixture.id, title: w.title, steps: w.steps } };
}

export function listWorkflows(
  fixture: MachineFixture,
): readonly { readonly id: string; readonly result: LoadResult }[] {
  return fixture.workflows.map((w) => ({ id: w.id, result: loadWorkflow(fixture, w.id) }));
}
