// OVERLAYKIT_DEBUG_ONLY: loaded only behind __DEV__ (R21.6).
// Pure snapshot schema v1 (design.md, "Recorded OCR snapshot").
import type { FrameRef, OcrResult, ReadableScript, Result } from '../../shared';
import type { ConfidenceScale, RawOcrLine } from '../../ocr';
import type { OverlayLayout } from '../overlay/build-items';

type Pt = { readonly x: number; readonly y: number };
type Sz = { readonly width: number; readonly height: number };

export type OcrSnapshotV1 = {
  readonly schema: 'overlaykit.ocr-snapshot';
  readonly version: 1;
  readonly exportedAt: string;
  readonly device: { readonly model: string; readonly manufacturer: string; readonly androidApiLevel: number };
  readonly frame: {
    readonly frameId: string;
    readonly capturedAtMs: number;
    readonly size: Sz;
    readonly source: 'still' | 'live';
    readonly mirrored: boolean;
  };
  readonly view: {
    readonly size: Sz;
    readonly insets: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
    readonly controlBars: { readonly top: number; readonly bottom: number };
    readonly fontScale: number;
  };
  readonly engine: { readonly id: string; readonly supportedScripts: readonly ReadableScript[]; readonly confidenceScale: ConfidenceScale };
  readonly rawLines: readonly {
    readonly text: string;
    readonly corners: readonly Pt[] | null;
    readonly box: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } | null;
    readonly confidence: number | null;
    readonly language: string | null;
  }[];
  readonly result: {
    readonly frameId: string;
    readonly capturedAtMs: number;
    readonly imageSize: Sz;
    readonly lines: readonly (
      | { readonly script: ReadableScript; readonly text: string; readonly quad: readonly Pt[]; readonly confidence?: number }
      | { readonly script: 'unsupported'; readonly code: 'OCR_UNSUPPORTED_SCRIPT'; readonly quad: readonly Pt[]; readonly confidence?: number }
    )[];
    readonly excludedLineCount: number;
    readonly qualityFlag?: 'OCR_LOW_QUALITY';
  } | null;
  readonly photo: string;
};

export function buildSnapshot(input: {
  readonly frame: FrameRef;
  readonly result: OcrResult | null;
  readonly rawLines: readonly RawOcrLine[];
  readonly layout: OverlayLayout;
  readonly engine: OcrSnapshotV1['engine'];
  readonly device: OcrSnapshotV1['device'];
  readonly exportedAt: string;
  readonly photo: string;
}): OcrSnapshotV1 {
  const { frame, layout } = input;
  return {
    schema: 'overlaykit.ocr-snapshot',
    version: 1,
    exportedAt: input.exportedAt,
    device: input.device,
    frame: { frameId: frame.frameId, capturedAtMs: frame.capturedAtMs, size: frame.size, source: frame.source, mirrored: frame.mirrored },
    view: { size: layout.view, insets: layout.insets, controlBars: layout.bars, fontScale: layout.fontScale },
    engine: input.engine,
    rawLines: input.rawLines.map((l) => ({ text: l.text, corners: l.corners, box: l.box, confidence: l.confidence, language: l.language })),
    result: input.result,
    photo: input.photo,
  };
}

export function serializeSnapshot(snapshot: OcrSnapshotV1): string {
  return JSON.stringify(snapshot, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const size = (v: unknown) => isObj(v) && finite(v.width) && finite(v.height);
const point = (v: unknown) => isObj(v) && finite(v.x) && finite(v.y);
const quad = (v: unknown) => Array.isArray(v) && v.length === 4 && v.every(point);

function validResult(r: unknown): boolean {
  if (r === null) return true;
  if (!isObj(r) || typeof r.frameId !== 'string' || !finite(r.capturedAtMs) || !size(r.imageSize) || !finite(r.excludedLineCount)) return false;
  if (!Array.isArray(r.lines)) return false;
  return r.lines.every((l) => isObj(l) && typeof l.script === 'string' && quad(l.quad) && (l.confidence === undefined || finite(l.confidence)));
}

function validRaw(l: unknown): boolean {
  if (!isObj(l) || typeof l.text !== 'string') return false;
  if (l.corners !== null && !(Array.isArray(l.corners) && l.corners.every(point))) return false;
  if (l.confidence !== null && !finite(l.confidence)) return false;
  return true;
}

/** Rejects a missing or non-finite required number and any quad without four points. */
export function parseSnapshot(json: string): Result<OcrSnapshotV1, 'SNAPSHOT_INVALID'> {
  const bad = { ok: false, error: 'SNAPSHOT_INVALID' } as const;
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch {
    return bad;
  }
  if (!isObj(v) || v.schema !== 'overlaykit.ocr-snapshot' || v.version !== 1) return bad;
  const { frame, view, device, engine } = v;
  if (typeof v.exportedAt !== 'string' || typeof v.photo !== 'string') return bad;
  if (!isObj(device) || typeof device.model !== 'string' || typeof device.manufacturer !== 'string' || !finite(device.androidApiLevel)) return bad;
  if (!isObj(frame) || typeof frame.frameId !== 'string' || !finite(frame.capturedAtMs) || !size(frame.size) || typeof frame.mirrored !== 'boolean') return bad;
  if (!isObj(view) || !size(view.size) || !finite(view.fontScale) || !isObj(view.insets) || !isObj(view.controlBars)) return bad;
  if (![view.insets.top, view.insets.right, view.insets.bottom, view.insets.left, view.controlBars.top, view.controlBars.bottom].every(finite)) return bad;
  if (!isObj(engine) || typeof engine.id !== 'string') return bad;
  if (!Array.isArray(v.rawLines) || !v.rawLines.every(validRaw)) return bad;
  if (!validResult(v.result)) return bad;
  return { ok: true, value: v as unknown as OcrSnapshotV1 };
}

/** Release-bundle search marker (R21.6). */
export const DEBUG_MARKER_SNAPSHOT = 'OVERLAYKIT_DEBUG_ONLY';
