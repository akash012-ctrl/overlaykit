import type { FrameId, FrameRef, FrameSource, Result, Size } from '../shared';
import type { PermissionState } from './types';

/** What the camera library reports about permission, in vendor-neutral form. */
export type PermissionSnapshot = {
  readonly status: 'undetermined' | 'granted' | 'denied';
  readonly canAskAgain: boolean;
};

/**
 * undetermined → undetermined; granted → granted; denied and canAskAgain → denied
 * (CAM_PERMISSION_DENIED, R1.3); denied and not canAskAgain → blocked
 * (CAM_PERMISSION_BLOCKED, R1.6).
 */
export function toPermissionState(snapshot: PermissionSnapshot): PermissionState {
  switch (snapshot.status) {
    case 'undetermined':
      return { kind: 'undetermined' };
    case 'granted':
      return { kind: 'granted' };
    case 'denied':
      return snapshot.canAskAgain
        ? { kind: 'denied', code: 'CAM_PERMISSION_DENIED' }
        : { kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' };
  }
}

/** EXIF orientations 5 to 8 store the image turned a quarter turn, so width and height swap. */
export function uprightSizeForExif(stored: Size, exifOrientation: number | undefined): Size {
  return exifOrientation !== undefined && exifOrientation >= 5 && exifOrientation <= 8
    ? { width: stored.height, height: stored.width }
    : stored;
}

/** EXIF orientations 2, 4, 5 and 7 include a mirror flip. */
export function isMirroredExif(exifOrientation: number | undefined): boolean {
  return exifOrientation === 2 || exifOrientation === 4 || exifOrientation === 5 || exifOrientation === 7;
}

function isValidDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** CAM_CAPTURE_FAILED when a dimension is not finite or not above zero (R3.7). Source is always 'still' (R3.5). */
export function toFrameRef(input: {
  readonly frameId: FrameId;
  readonly capturedAtMs: number;
  readonly size: Size;
  readonly mirrored: boolean;
  readonly uri: string;
}): Result<FrameRef, 'CAM_CAPTURE_FAILED'> {
  if (!isValidDimension(input.size.width) || !isValidDimension(input.size.height) || !Number.isFinite(input.capturedAtMs)) {
    return { ok: false, error: 'CAM_CAPTURE_FAILED' };
  }
  return {
    ok: true,
    value: {
      frameId: input.frameId,
      capturedAtMs: input.capturedAtMs,
      size: { width: input.size.width, height: input.size.height },
      source: 'still',
      mirrored: input.mirrored,
      pixels: { kind: 'file', uri: input.uri },
    },
  };
}

/** Ids "still-1", "still-2", … unique within the session (R3.2). */
export function createFrameIdSource(source: FrameSource): { next(): FrameId } {
  let count = 0;
  return {
    next() {
      count += 1;
      return `${source}-${count}`;
    },
  };
}
