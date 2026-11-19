import type { FrameId, Result } from '../shared';
import type { FileSystemPort, StillDeleteOutcome } from './file-system-port';

/** Folder for temporary stills, inside the app cache (R4.1). */
export const STILLS_FOLDER = 'overlaykit-stills';

export type StillFile = { readonly uri: string; readonly frameId: FrameId };

export interface TempStillStore {
  /** Moves the camera's file into the stills folder as `<frameId>.jpg`. */
  create(sourceUri: string, frameId: FrameId): Promise<Result<StillFile, 'CAM_CAPTURE_FAILED'>>;
  delete(uri: string): Promise<StillDeleteOutcome>;
  /** Deletes every file in the stills folder. Resolves to the number it couldn't delete (R4.4, R4.5). */
  purgeAll(): Promise<number>;
}

function join(directory: string, name: string): string {
  return directory.endsWith('/') ? `${directory}${name}` : `${directory}/${name}`;
}

export function createTempStillStore(fs: FileSystemPort): TempStillStore {
  const folder = () => join(fs.cacheDirectory(), STILLS_FOLDER);
  return {
    async create(sourceUri, frameId) {
      const directory = folder();
      if (!(await fs.ensureDirectory(directory))) return { ok: false, error: 'CAM_CAPTURE_FAILED' };
      const uri = join(directory, `${frameId}.jpg`);
      if (!(await fs.move(sourceUri, uri))) return { ok: false, error: 'CAM_CAPTURE_FAILED' };
      return { ok: true, value: { uri, frameId } };
    },
    delete(uri) {
      return fs.delete(uri);
    },
    async purgeAll() {
      const directory = folder();
      const names = await fs.list(directory);
      let failed = 0;
      for (const name of names) {
        if ((await fs.delete(join(directory, name))) === 'failed') failed += 1;
      }
      return failed;
    },
  };
}
