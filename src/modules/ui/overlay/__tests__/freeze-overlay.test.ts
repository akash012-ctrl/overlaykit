import { notConfiguredProvider } from '../../../locale';
import type { FrameRef, OcrResult, Quad } from '../../../shared';
import type { FreezeOverlayAction, FreezeOverlayState } from '../freeze-overlay';
import { EMPTY_FREEZE_OVERLAY, freezeOverlayReducer, translationRequestFor } from '../freeze-overlay';

// Hand-built frames and results for the reducer. Properties 14 and 15, with
// line payloads from recorded snapshots, follow in task 15.2.

function box(top: number): Quad {
  return [
    { x: 100, y: top },
    { x: 900, y: top },
    { x: 900, y: top + 80 },
    { x: 100, y: top + 80 },
  ];
}

function frame(id: string): FrameRef {
  return {
    frameId: id,
    capturedAtMs: 100,
    size: { width: 3000, height: 4000 },
    source: 'still',
    mirrored: false,
    pixels: { kind: 'file', uri: `file:///cache/overlaykit-stills/${id}.jpg` },
  };
}

function result(id: string, fields: Partial<OcrResult> = {}): OcrResult {
  return {
    frameId: id,
    capturedAtMs: 100,
    imageSize: { width: 3000, height: 4000 },
    lines: [
      { script: 'latin', text: 'TICKETS', quad: box(100) },
      { script: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT', quad: box(300) },
      { script: 'devanagari', text: 'टिकट', quad: box(500) },
    ],
    excludedLineCount: 0,
    ...fields,
  };
}

function run(actions: readonly FreezeOverlayAction[], start: FreezeOverlayState = EMPTY_FREEZE_OVERLAY): FreezeOverlayState {
  return actions.reduce(freezeOverlayReducer, start);
}

const APPLIED = run([
  { type: 'still-shown', frame: frame('still-1') },
  { type: 'result-applied', result: result('still-1') },
]);

describe('freezeOverlayReducer', () => {
  it('creates one source per line with the result frameId, pending or unsupported', () => {
    expect(APPLIED.shown?.frameId).toBe('still-1');
    expect(APPLIED.sources.map((s) => [s.id, s.frameId, s.label])).toEqual([
      ['still-1/0', 'still-1', { kind: 'pending' }],
      ['still-1/1', 'still-1', { kind: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT' }],
      ['still-1/2', 'still-1', { kind: 'pending' }],
    ]);
    expect(APPLIED.lowQuality).toBe(false);
  });

  it('keeps the low-quality flag of the result', () => {
    const state = run([
      { type: 'still-shown', frame: frame('still-1') },
      { type: 'result-applied', result: result('still-1', { qualityFlag: 'OCR_LOW_QUALITY' }) },
    ]);
    expect(state.lowQuality).toBe(true);
    expect(state.sources).toHaveLength(3);
  });

  it('discards a late result for a replaced still (R15.7)', () => {
    const replaced = run([{ type: 'still-shown', frame: frame('still-2') }], APPLIED);
    expect(replaced.sources).toEqual([]); // R15.6: old sources are gone before new ones arrive
    const late = freezeOverlayReducer(replaced, { type: 'result-applied', result: result('still-1') });
    expect(late).toBe(replaced);
    const current = freezeOverlayReducer(late, { type: 'result-applied', result: result('still-2') });
    expect(current.sources.every((s) => s.frameId === 'still-2')).toBe(true);
  });

  it('ignores a result with no still shown, and a repeated result for the shown still', () => {
    expect(freezeOverlayReducer(EMPTY_FREEZE_OVERLAY, { type: 'result-applied', result: result('still-1') })).toBe(
      EMPTY_FREEZE_OVERLAY,
    );
    expect(freezeOverlayReducer(APPLIED, { type: 'result-applied', result: result('still-1') })).toBe(APPLIED);
  });

  it.each(['still-dismissed', 'cleared'] as const)('removes every source on %s (R15.5, R4.7)', (type) => {
    expect(freezeOverlayReducer(APPLIED, { type })).toEqual(EMPTY_FREEZE_OVERLAY);
  });

  it('keeps the sources while the still stays shown (R15.3)', () => {
    const later = run(
      [
        { type: 'result-applied', result: result('still-9') },
        { type: 'translation-settled', frameId: 'still-9', outcomes: [] },
      ],
      APPLIED,
    );
    expect(later).toBe(APPLIED);
  });

  describe('translation-settled', () => {
    it('moves pending labels to failed with TR_NOT_CONFIGURED and leaves unsupported ones', () => {
      const settled = freezeOverlayReducer(APPLIED, {
        type: 'translation-settled',
        frameId: 'still-1',
        outcomes: [
          { id: 'still-1/0', outcome: { ok: false, error: 'TR_NOT_CONFIGURED' } },
          { id: 'still-1/1', outcome: { ok: true, value: { text: 'never shown', providerId: 'test' } } },
          { id: 'still-1/2', outcome: { ok: false, error: 'TR_NOT_CONFIGURED' } },
        ],
      });
      expect(settled.sources.map((s) => s.label)).toEqual([
        { kind: 'failed', code: 'TR_NOT_CONFIGURED' },
        { kind: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT' },
        { kind: 'failed', code: 'TR_NOT_CONFIGURED' },
      ]);
    });

    it('shows translated only for an ok outcome from a provider (R17.8)', () => {
      const settled = freezeOverlayReducer(APPLIED, {
        type: 'translation-settled',
        frameId: 'still-1',
        outcomes: [{ id: 'still-1/0', outcome: { ok: true, value: { text: 'टिकट', providerId: 'test-provider' } } }],
      });
      expect(settled.sources[0].label).toEqual({ kind: 'translated', text: 'टिकट', providerId: 'test-provider' });
      expect(settled.sources[2].label).toEqual({ kind: 'pending' });
    });

    it('changes only pending labels, so a second outcome does not overwrite the first', () => {
      const first = freezeOverlayReducer(APPLIED, {
        type: 'translation-settled',
        frameId: 'still-1',
        outcomes: [{ id: 'still-1/0', outcome: { ok: false, error: 'TR_NOT_CONFIGURED' } }],
      });
      const second = freezeOverlayReducer(first, {
        type: 'translation-settled',
        frameId: 'still-1',
        outcomes: [{ id: 'still-1/0', outcome: { ok: true, value: { text: 'late', providerId: 'test' } } }],
      });
      expect(second).toBe(first);
    });

    it('ignores outcomes for a still that is no longer shown', () => {
      const replaced = run(
        [
          { type: 'still-shown', frame: frame('still-2') },
          { type: 'result-applied', result: result('still-2') },
        ],
        APPLIED,
      );
      const late = freezeOverlayReducer(replaced, {
        type: 'translation-settled',
        frameId: 'still-1',
        outcomes: [{ id: 'still-1/0', outcome: { ok: false, error: 'TR_NOT_CONFIGURED' } }],
      });
      expect(late).toBe(replaced);
    });
  });

  it('gives every source exactly one of the four label states', () => {
    for (const source of APPLIED.sources) {
      expect(['pending', 'translated', 'failed', 'unsupported']).toContain(source.label.kind);
    }
  });
});

describe('translationRequestFor', () => {
  it('sends readable lines only, once each, in line order, with matching source ids (R17.3, R17.4)', () => {
    expect(translationRequestFor(result('still-1'))).toEqual({
      ids: ['still-1/0', 'still-1/2'],
      texts: ['TICKETS', 'टिकट'],
    });
  });

  it('with the not-configured adapter, settles every readable label as failed', async () => {
    const request = translationRequestFor(result('still-1'));
    const outcomes = await notConfiguredProvider.translate({ texts: request.texts, source: 'auto', target: 'en' });
    const settled = freezeOverlayReducer(APPLIED, {
      type: 'translation-settled',
      frameId: 'still-1',
      outcomes: request.ids.map((id, i) => ({ id, outcome: outcomes[i] })),
    });
    expect(settled.sources.map((s) => s.label.kind)).toEqual(['failed', 'unsupported', 'failed']);
  });
});
