// Core types shared by every module. No React, React Native, or module imports
// here (docs/ARCHITECTURE.md §4).

/** A position with the origin at the top left, in image pixels or view layout units. */
export type Point = { readonly x: number; readonly y: number };

/** A width and height, in image pixels or view layout units. */
export type Size = { readonly width: number; readonly height: number };

/** Success or failure, so modules return errors instead of throwing across boundaries. */
export type Result<T, E extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type LocaleCode = 'en' | 'hi' | 'kn';

/**
 * Four corners of one text line in the text's reading order:
 * [0] start of the top edge, [1] end of the top edge,
 * [2] end of the bottom edge, [3] start of the bottom edge.
 * The baseline runs from [3] to [2]. For upright left-to-right text in a
 * y-down space this is top-left, top-right, bottom-right, bottom-left:
 * clockwise on screen, with a positive shoelace area.
 */
export type Quad = readonly [Point, Point, Point, Point];

/** Shoelace area. Positive for the corner order above in a y-down space. */
export function quadSignedArea(quad: Quad): number {
  let twiceArea = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return twiceArea / 2;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Mean distance of corners [0] and [1] from the baseline through [3] and [2].
 * Falls back to the mean length of edges [0]-[3] and [1]-[2] when the baseline
 * has zero length.
 */
export function quadLineHeight(quad: Quad): number {
  const [topStart, topEnd, baseEnd, baseStart] = quad;
  const baseLength = distance(baseStart, baseEnd);
  if (baseLength === 0) {
    return (distance(topStart, baseStart) + distance(topEnd, baseEnd)) / 2;
  }
  const dx = baseEnd.x - baseStart.x;
  const dy = baseEnd.y - baseStart.y;
  const distanceFromBaseline = (p: Point) =>
    Math.abs(dx * (p.y - baseStart.y) - dy * (p.x - baseStart.x)) / baseLength;
  return (distanceFromBaseline(topStart) + distanceFromBaseline(topEnd)) / 2;
}

export type ReadableScript = 'latin' | 'devanagari';
export type Script = ReadableScript | 'unsupported';

/** Unique within one app session (R3.2). */
export type FrameId = string;
export type FrameSource = 'still' | 'live';

export type FramePixels =
  | { readonly kind: 'file'; readonly uri: string }
  /** WHERE Live mode. Valid only during the frame-processor call. */
  | { readonly kind: 'live-frame'; readonly handle: unknown };

export type FrameRef = {
  readonly frameId: FrameId;
  /** Milliseconds from the app's MonotonicClock, read at capture time (R3.3). */
  readonly capturedAtMs: number;
  /** Upright pixels, origin top left. Finite and above zero (R3.4, R3.7). */
  readonly size: Size;
  readonly source: FrameSource;
  /** From the camera library's report for this frame. Expected false: back camera (R11.1). */
  readonly mirrored: boolean;
  readonly pixels: FramePixels;
};

export type ReadableLine = {
  readonly script: ReadableScript;
  /** NFC, trimmed, never empty. */
  readonly text: string;
  /** Image space of the FrameRef it came from (R5.4). */
  readonly quad: Quad;
  /** 0..1, present only when the engine gives one (R5.6, R5.7). */
  readonly confidence?: number;
};

/** No text field: engine text for an unsupported line is never shown or sent (DD-3). */
export type UnsupportedLine = {
  readonly script: 'unsupported';
  readonly code: 'OCR_UNSUPPORTED_SCRIPT';
  readonly quad: Quad;
  readonly confidence?: number;
};

export type OcrLine = ReadableLine | UnsupportedLine;

export type OcrResult = {
  /** Copied from the FrameRef (R5.2). */
  readonly frameId: FrameId;
  /** Copied from the FrameRef (R5.2). */
  readonly capturedAtMs: number;
  /** The FrameRef's upright size (R5.3). */
  readonly imageSize: Size;
  /** At least one line. A read with no valid line is OCR_NO_TEXT, never an empty OcrResult. */
  readonly lines: readonly OcrLine[];
  /** Lines dropped for an invalid quad or empty text (R6.3). */
  readonly excludedLineCount: number;
  /** Set when the Low-quality rule holds. Lines are kept (R8.3). */
  readonly qualityFlag?: 'OCR_LOW_QUALITY';
};

/** Every CAM_* code once (docs/ARCHITECTURE.md §8), for exhaustive QE-1 tests. */
export const CAM_ERROR_CODES = [
  'CAM_PERMISSION_DENIED',
  'CAM_PERMISSION_BLOCKED',
  'CAM_UNAVAILABLE',
  'CAM_CAPTURE_FAILED',
] as const;
export type CamErrorCode = (typeof CAM_ERROR_CODES)[number];

/**
 * Every OCR_* code once. OCR_RECOGNITION_FAILED was added by D-033 (OQ-7).
 * OCR_LOW_QUALITY and OCR_UNSUPPORTED_SCRIPT are markers on a successful
 * OcrResult, never Result errors.
 */
export const OCR_ERROR_CODES = [
  'OCR_ENGINE_UNAVAILABLE',
  'OCR_RECOGNITION_FAILED',
  'OCR_NO_TEXT',
  'OCR_LOW_QUALITY',
  'OCR_UNSUPPORTED_SCRIPT',
] as const;
export type OcrErrorCode = (typeof OCR_ERROR_CODES)[number];

/** Every TR_* code once (docs/ARCHITECTURE.md 8). Spec A had only TR_NOT_CONFIGURED. */
export const TR_ERROR_CODES = [
  'TR_NOT_CONFIGURED',
  'TR_OFFLINE',
  'TR_TIMEOUT',
  'TR_RATE_LIMITED',
  'TR_PROVIDER_ERROR',
  'TR_UNSUPPORTED_PAIR',
  'TR_KEY_INVALID',
  'TR_NO_CREDITS',
] as const;
export type TrErrorCode = (typeof TR_ERROR_CODES)[number];

export const MCH_ERROR_CODES = ['MCH_NOT_VERIFIED', 'MCH_AMBIGUOUS'] as const;
export type MchErrorCode = (typeof MCH_ERROR_CODES)[number];

export const CMP_ERROR_CODES = ['CMP_NOT_VISIBLE'] as const;
export type CmpErrorCode = (typeof CMP_ERROR_CODES)[number];

export const GD_ERROR_CODES = [
  'GD_UNSUPPORTED',
  'GD_MACHINE_LOST',
  'GD_MACHINE_CHANGED',
  'GD_CHECKPOINT_NOT_SEEN',
  'GD_FIXTURE_INVALID',
] as const;
export type GdErrorCode = (typeof GD_ERROR_CODES)[number];

export const SP_ERROR_CODES = ['SP_NO_VOICE', 'SP_FAILED'] as const;
export type SpErrorCode = (typeof SP_ERROR_CODES)[number];

/** Languages the camera reads (D-005). */
export type SourceLocale = 'en' | 'hi';
export type LanguagePair = { readonly source: SourceLocale; readonly target: LocaleCode };

/** detectedSource is null or absent when the provider reports none (optional so spec A values still type-check). */
export type Translation = {
  readonly text: string;
  readonly providerId: string;
  readonly detectedSource?: LocaleCode | null;
};
export type TranslationOutcome = Result<Translation, TrErrorCode>;

/** Similarity from Machine space to Image space: uniform scale, rotation, translation (ARCHITECTURE.md 7). */
export type MachineFit = {
  /** Finite and above zero. */
  readonly scale: number;
  /** Finite. */
  readonly rotationRad: number;
  /** Finite. */
  readonly translation: Point;
};

export type MachineStatus = 'verified' | 'ambiguous' | 'none';
export type MachineMatch =
  | {
      readonly status: 'verified';
      readonly machineId: 'TM-01';
      readonly frameId: FrameId;
      readonly fit: MachineFit;
      readonly score: number;
      readonly matchedAnchors: number;
    }
  | {
      readonly status: 'ambiguous';
      readonly frameId: FrameId;
      readonly code: 'MCH_AMBIGUOUS';
      readonly matchedAnchors: number;
    }
  | { readonly status: 'none'; readonly frameId: FrameId; readonly code: 'MCH_NOT_VERIFIED' };

export type ComponentKind =
  | 'card-reader'
  | 'coin-slot'
  | 'note-slot'
  | 'touchscreen'
  | 'button'
  | 'ticket-tray'
  | 'other';

/** A fixture component mapped into the frame. frameId is the OcrResult's. */
export type LocatedComponent = {
  readonly id: string;
  readonly kind: ComponentKind;
  readonly frameId: FrameId;
  /** Image space, finite. */
  readonly quad: Quad;
};

/** A monotonic clock in milliseconds. capture provides the app's clock. */
export type MonotonicClock = () => number;
