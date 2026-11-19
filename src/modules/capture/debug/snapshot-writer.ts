// OVERLAYKIT_DEBUG_ONLY: loaded only behind __DEV__ (R21.6).
import type { Result } from '../../shared';
import type { FileSystemPort } from '../file-system-port';

export type SnapshotWriter = {
  /**
   * Copies the still and writes the JSON beside it in app-specific storage
   * (not the cache, not the gallery: R21.4, R21.5). `buildJson` gets the
   * photo file name so the snapshot can name it.
   */
  write(input: {
    readonly frameId: string;
    readonly stillUri: string;
    readonly buildJson: (photoName: string) => string;
  }): Promise<Result<{ readonly jsonUri: string; readonly photoUri: string }, 'SNAPSHOT_WRITE_FAILED'>>;
};

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function createSnapshotWriter(fs: FileSystemPort, now: () => Date = () => new Date()): SnapshotWriter {
  return {
    async write({ frameId, stillUri, buildJson }) {
      const failed = { ok: false, error: 'SNAPSHOT_WRITE_FAILED' } as const;
      const directory = `${fs.documentDirectory().replace(/\/?$/, '/')}ocr-snapshots/`;
      if (!(await fs.ensureDirectory(directory))) return failed;
      const base = `${stamp(now())}_${frameId.replace(/[^A-Za-z0-9_-]/g, '-')}`;
      const photoUri = `${directory}${base}.jpg`;
      const jsonUri = `${directory}${base}.json`;
      if (!(await fs.copy(stillUri, photoUri))) return failed;
      if (!(await fs.writeText(jsonUri, buildJson(`${base}.jpg`)))) {
        await fs.delete(photoUri);
        return failed;
      }
      return { ok: true, value: { jsonUri, photoUri } };
    },
  };
}

/** Release-bundle search marker (R21.6). */
export const DEBUG_MARKER_SNAPSHOT_WRITER = 'OVERLAYKIT_DEBUG_ONLY';
