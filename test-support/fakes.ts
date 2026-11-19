// Test-only fakes for the capture and ocr ports. App code may not import
// test-support/ (eslint.config.js).
import type { CameraAdapter, PreviewHandle, UprightPhoto } from '../src/modules/capture/camera-adapter';
import type { FileSystemPort, StillDeleteOutcome } from '../src/modules/capture/file-system-port';
import type { PermissionSnapshot } from '../src/modules/capture/frame';
import type { Result } from '../src/modules/shared';

export type FakeFs = FileSystemPort & {
  readonly files: Set<string>;
  readonly deleted: string[];
  failMove: boolean;
  failEnsure: boolean;
  failDelete: boolean;
};

/** In-memory file system. Directories are implied by file paths. */
export function createFakeFs(initial: readonly string[] = []): FakeFs {
  const files = new Set(initial);
  const fs: FakeFs = {
    files,
    deleted: [],
    failMove: false,
    failEnsure: false,
    failDelete: false,
    cacheDirectory: () => 'file:///cache/',
    documentDirectory: () => 'file:///documents/',
    async ensureDirectory() {
      return !fs.failEnsure;
    },
    async move(from, to) {
      if (fs.failMove || !files.has(from)) return false;
      files.delete(from);
      files.add(to);
      return true;
    },
    async copy(from, to) {
      if (!files.has(from)) return false;
      files.add(to);
      return true;
    },
    async writeText(uri) {
      files.add(uri);
      return true;
    },
    async delete(uri): Promise<StillDeleteOutcome> {
      fs.deleted.push(uri);
      if (fs.failDelete) return 'failed';
      return files.delete(uri) ? 'deleted' : 'missing';
    },
    async list(directoryUri) {
      const prefix = directoryUri.endsWith('/') ? directoryUri : `${directoryUri}/`;
      return [...files].filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length));
    },
  };
  return fs;
}

export type FakeCamera = CameraAdapter & {
  permission: PermissionSnapshot;
  photo: Result<UprightPhoto, 'CAM_CAPTURE_FAILED'> | 'throw';
  readonly handle: PreviewHandle;
};

export function createFakeCamera(fs: FakeFs, photoUri = 'file:///camera/photo.jpg'): FakeCamera {
  const camera: FakeCamera = {
    id: 'fake-camera',
    permission: { status: 'granted', canAskAgain: true },
    photo: { ok: true, value: { uri: photoUri, size: { width: 3000, height: 4000 }, mirrored: false } },
    handle: { __brand: 'PreviewHandle' },
    async getPermission() {
      return camera.permission;
    },
    async requestPermission() {
      return camera.permission;
    },
    async takeUprightPhoto() {
      if (camera.photo === 'throw') throw new Error('camera exploded');
      if (camera.photo.ok) fs.files.add(camera.photo.value.uri);
      return camera.photo;
    },
  };
  return camera;
}
