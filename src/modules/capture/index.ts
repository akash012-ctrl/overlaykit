// Public API of capture. Vendor types never leave this module (R23.4).
import { Linking } from 'react-native';

import { expoCameraAdapter } from './camera-adapter';
import { createExpoFileSystemPort } from './file-system-port';
import type { CaptureService } from './service';
import { createCaptureServiceFrom } from './service';
import { createTempStillStore } from './still-store';

export type { CameraState, PermissionState } from './types';
export type { PreviewHandle } from './camera-adapter';
export type { CaptureService } from './service';
export type { StillDeleteOutcome } from './file-system-port';
export { CameraPreview } from './CameraPreview';
export type { CameraPreviewProps } from './CameraPreview';
export { StillView } from './StillView';
export type { StillViewProps } from './StillView';

/** The app's monotonic clock (R3.3). */
export const monotonicClock = (): number => performance.now();

/** The default service, wrapping the native adapters (the only singletons allowed). */
export function createCaptureService(): CaptureService {
  const fs = createExpoFileSystemPort();
  return createCaptureServiceFrom({
    camera: expoCameraAdapter,
    store: createTempStillStore(fs),
    fs,
    clock: monotonicClock,
    openSettings: () => Linking.openSettings(),
  });
}
