import type { PlanAction, PlannerOutput, ProposedStep, Result } from '../shared';

const stepProps = {
  instruction: { type: 'string', minLength: 1 },
  action: { type: 'string', enum: ['press', 'enter', 'read', 'wait'] },
  targetText: { type: 'string' },
  enterHint: { type: ['string', 'null'] },
  appear: { type: 'array', items: { type: 'string' } },
  disappear: { type: 'array', items: { type: 'string' } },
};

/** JSON schema text passed to the runtime for constrained output. */
export const PLANNER_OUTPUT_SCHEMA: string = JSON.stringify({
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { const: 'step' },
        step: {
          type: 'object',
          properties: stepProps,
          required: Object.keys(stepProps),
          additionalProperties: false,
        },
      },
      required: ['kind', 'step'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { kind: { const: 'finished' } },
      required: ['kind'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { kind: { const: 'cannot-plan' }, reason: { type: 'string', minLength: 1 } },
      required: ['kind', 'reason'],
      additionalProperties: false,
    },
  ],
});

const ACTIONS: readonly string[] = ['press', 'enter', 'read', 'wait'];
const STEP_KEYS = ['instruction', 'action', 'targetText', 'enterHint', 'appear', 'disappear'];

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasExactKeys(o: Obj, keys: readonly string[]): boolean {
  const own = Object.keys(o);
  return own.length === keys.length && keys.every((k) => k in o);
}

function isStrings(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

function parseStep(s: unknown): ProposedStep | null {
  if (!isObj(s) || !hasExactKeys(s, STEP_KEYS)) return null;
  const { instruction, action, targetText, enterHint, appear, disappear } = s;
  if (typeof instruction !== 'string' || instruction.trim() === '') return null;
  if (typeof action !== 'string' || !ACTIONS.includes(action)) return null;
  if (typeof targetText !== 'string') return null;
  if (enterHint !== null && typeof enterHint !== 'string') return null;
  if (!isStrings(appear) || !isStrings(disappear)) return null;
  if (action === 'press' && targetText.trim() === '') return null;
  if (action === 'enter' && (typeof enterHint !== 'string' || enterHint.trim() === '')) return null;
  return { instruction, action: action as PlanAction, targetText, enterHint, appear, disappear };
}

/**
 * Strict parse of model text. Whole text must be one JSON value of the schema.
 * No repair: no fence stripping, no trailing-comma fixes, no default fill-in.
 * Works the same for constrained and unconstrained output.
 */
export function parseOutput(raw: string): Result<PlannerOutput, 'PL_BAD_OUTPUT'> {
  const bad = { ok: false, error: 'PL_BAD_OUTPUT' } as const;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return bad;
  }
  if (!isObj(v)) return bad;
  if (v.kind === 'finished' && hasExactKeys(v, ['kind'])) {
    return { ok: true, value: { kind: 'finished' } };
  }
  if (v.kind === 'cannot-plan' && hasExactKeys(v, ['kind', 'reason'])) {
    if (typeof v.reason !== 'string' || v.reason.trim() === '') return bad;
    return { ok: true, value: { kind: 'cannot-plan', reason: v.reason } };
  }
  if (v.kind === 'step' && hasExactKeys(v, ['kind', 'step'])) {
    const step = parseStep(v.step);
    return step ? { ok: true, value: { kind: 'step', step } } : bad;
  }
  return bad;
}
