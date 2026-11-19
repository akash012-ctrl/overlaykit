// The only file that imports the camera library (D-036, lint VENDOR_OWNERS).
import { Camera, type CameraView } from 'expo-camera';

import type { Result, Size } from '../shared';
import type { PermissionSnapshot } from './frame';
import { isMirroredExif, uprightSizeForExif } from './frame';

/** Opaque handle to a mounted preview. Only capture reads it. */
export type PreviewHandle = { readonly __brand: 'PreviewHandle' };

export type UprightPhoto = { readonly uri: string; readonly size: Size; readonly mirrored: boolean };

export interface CameraAdapter {
  /** Library name and version, for snapshots and DECISIONS.md. */
  readonly id: string;
  getPermission(): Promise<PermissionSnapshot>;
  requestPermission(): Promise<PermissionSnapshot>;
  /** Resolves to a file whose pixels are already upright. Never rejects. */
  takeUprightPhoto(preview: PreviewHandle): Promise<Result<UprightPhoto, 'CAM_CAPTURE_FAILED'>>;
}

/** Pairs the opaque handle with the mounted vendor view. */
export function toPreviewHandle(view: CameraView): PreviewHandle {
  return view as unknown as PreviewHandle;
}

function toSnapshot(response: { status: string; canAskAgain: boolean }): PermissionSnapshot {
  const status = response.status === 'granted' ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined';
  return { status, canAskAgain: response.canAskAgain };
}

function exifOrientationOf(exif: unknown): number | undefined {
  if (!exif || typeof exif !== 'object') return undefined;
  const value = (exif as Record<string, unknown>).Orientation;
  return typeof value === 'number' ? value : undefined;
}

export const expoCameraAdapter: CameraAdapter = {
  id: 'expo-camera@58',
  async getPermission() {
    return toSnapshot(await Camera.getCameraPermissionsAsync());
  },
  async requestPermission() {
    return toSnapshot(await Camera.requestCameraPermissionsAsync());
  },
  async takeUprightPhoto(preview) {
    try {
      const view = preview as unknown as CameraView;
      // skipProcessing stays false, so expo-camera rotates the pixels to match the
      // device orientation (docs.expo.dev/versions/latest/sdk/camera). The app is
      // portrait-only, so the result is upright. EXIF is read to confirm it.
      const picture = await view.takePictureAsync({ quality: 0.9, exif: true, skipProcessing: false, shutterSound: false });
      if (!picture?.uri) return { ok: false, error: 'CAM_CAPTURE_FAILED' };
      const orientation = exifOrientationOf(picture.exif);
      // A file still tagged with a rotation would be read sideways by OCR. Size it as
      // displayed upright; the OCR module re-checks the decoded size against this.
      const size = uprightSizeForExif({ width: picture.width, height: picture.height }, orientation === 1 ? undefined : orientation);
      return { ok: true, value: { uri: picture.uri, size, mirrored: isMirroredExif(orientation) } };
    } catch {
      return { ok: false, error: 'CAM_CAPTURE_FAILED' };
    }
  },
};
