import type { FrameRef, MonotonicClock, Result } from '../shared';
import type { CameraAdapter, PreviewHandle } from './camera-adapter';
import type { FileSystemPort, StillDeleteOutcome } from './file-system-port';
import { createFrameIdSource, toFrameRef, toPermissionState } from './frame';
import type { TempStillStore } from './still-store';
import type { PermissionState } from './types';

export interface CaptureService {
  readPermission(): Promise<PermissionState>;
  /** R1.5 */
  requestPermission(): Promise<PermissionState>;
  /** Android settings page for the app (R1.8). */
  openAppSettings(): Promise<void>;
  /** One still from the back camera. Never rejects (R3.1, R3.6). */
  captureStill(preview: PreviewHandle | null): Promise<Result<FrameRef, 'CAM_CAPTURE_FAILED'>>;
  /** R4.2, R4.3 */
  releaseStill(frame: FrameRef): Promise<StillDeleteOutcome>;
  /** Deletes every temporary still. Resolves to the number of files it couldn't delete (R4.4, R4.5). */
  purgeStills(): Promise<number>;
  readonly clock: MonotonicClock;
}

const BLOCKED_OR_UNKNOWN: PermissionState = { kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' };

/**
 * A capture that has not finished by then fails (CAM_CAPTURE_FAILED). A photo request can hang when the camera is
 * released mid-capture (the app went to the background); without this, every read queued behind it waited forever.
 */
export const CAPTURE_TIMEOUT_MS = 8000;

export function createCaptureServiceFrom(deps: {
  readonly camera: CameraAdapter;
  readonly store: TempStillStore;
  readonly fs: FileSystemPort;
  readonly clock: MonotonicClock;
  readonly openSettings: () => Promise<void>;
  readonly timeoutMs?: number;
}): CaptureService {
  const ids = createFrameIdSource('still');
  const { camera, store, fs, clock } = deps;

  return {
    clock,
    async readPermission() {
      try {
        return toPermissionState(await camera.getPermission());
      } catch {
        return BLOCKED_OR_UNKNOWN;
      }
    },
    async requestPermission() {
      try {
        return toPermissionState(await camera.requestPermission());
      } catch {
        return BLOCKED_OR_UNKNOWN;
      }
    },
    async openAppSettings() {
      try {
        await deps.openSettings();
      } catch {
        // Nothing to report: the state is re-read when the app returns (R1.9).
      }
    },
    async captureStill(preview) {
      try {
        const frameId = ids.next();
        if (!preview) return { ok: false, error: 'CAM_CAPTURE_FAILED' };
        const pending = camera.takeUprightPhoto(preview);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = new Promise<'timeout'>((resolve) => {
          timer = setTimeout(() => resolve('timeout'), deps.timeoutMs ?? CAPTURE_TIMEOUT_MS);
        });
        const photo = await Promise.race([pending, timedOut]);
        clearTimeout(timer);
        if (photo === 'timeout') {
          // A photo that lands after the timeout is deleted, never left in the cache (R4.6).
          void pending.then((late) => (late.ok ? fs.delete(late.value.uri) : undefined)).catch(() => undefined);
          return { ok: false, error: 'CAM_CAPTURE_FAILED' };
        }
        if (!photo.ok) return photo;
        // Read when the photo is reported taken; the library's own timestamp isn't used.
        const capturedAtMs = clock();
        const stored = await store.create(photo.value.uri, frameId);
        if (!stored.ok) {
          await fs.delete(photo.value.uri); // R4.6
          return stored;
        }
        const frame = toFrameRef({
          frameId,
          capturedAtMs,
          size: photo.value.size,
          mirrored: photo.value.mirrored,
          uri: stored.value.uri,
        });
        if (!frame.ok) await store.delete(stored.value.uri); // R3.7, R4.6
        return frame;
      } catch {
        return { ok: false, error: 'CAM_CAPTURE_FAILED' };
      }
    },
    async releaseStill(frame) {
      if (frame.pixels.kind !== 'file') return 'missing';
      return store.delete(frame.pixels.uri);
    },
    purgeStills() {
      return store.purgeAll();
    },
  };
}
