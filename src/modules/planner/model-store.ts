// Finds, checks and downloads the on-device models (D-048, D-049). It never deletes a file
// that is already in place, so a pushed file is safe. A download goes through `<name>.part`
// inside the native module, which deletes the part file on a size or SHA-256 mismatch.
// No network code in JS: the transfer runs in the native module, HTTPS only, no token.
import type { PlErrorCode, Result } from '../shared';
import { MODEL_MANIFEST, MODEL_ORDER, type ModelId, type ModelManifest } from './model-manifest';

/** Download failures, as the native module reports them, plus the two the store adds. */
export type DownloadFailure =
  | 'NO_URL' // the model has no URL (sideload only)
  | 'BAD_URL' // not https
  | 'BUSY'
  | 'OFFLINE'
  | 'NO_SPACE'
  | 'HTTP'
  | 'SIZE_MISMATCH'
  | 'HASH_MISMATCH'
  | 'CANCELLED'
  | 'FAILED';

/**
 * File access and download the store needs. The implementation is in adapters/litert.ts, the only
 * file that touches the native module. Methods never throw.
 */
export interface ModelFilePort {
  /** App files directory, with a trailing slash. */
  filesDirectory(): string;
  /** Size in bytes, or null when the file doesn't exist or can't be read. */
  fileSize(uri: string): Promise<number | null>;
  /** Lower-case hex SHA-256 of the whole file, or null when it can't be read. */
  sha256(uri: string): Promise<string | null>;
  /** Resumable HTTPS download to `dest`; verified by size and SHA-256 before the rename. */
  download(url: string, dest: string, sizeBytes: number, sha256: string): Promise<Result<true, DownloadFailure>>;
  /** Stops a running download. The part file is kept, so the next download resumes. */
  cancelDownload(): void;
  /** Progress of the running download. Returns the unsubscribe function. */
  onProgress(cb: (receivedBytes: number, totalBytes: number) => void): () => void;
}

export type ModelStatus =
  | { readonly kind: 'missing' }
  | { readonly kind: 'downloading'; readonly receivedBytes: number; readonly totalBytes: number }
  | { readonly kind: 'invalid'; readonly reason: 'size' | 'checksum' }
  | { readonly kind: 'ready'; readonly checksum: 'verified' | 'unchecked' };

export type ModelCheck =
  | { readonly kind: 'missing'; readonly code: 'PL_NO_MODEL' }
  | { readonly kind: 'invalid'; readonly code: PlErrorCode; readonly reason: 'size' | 'checksum' }
  | { readonly kind: 'ready'; readonly modelId: ModelId; readonly path: string; readonly checksum: 'verified' | 'unchecked' };

export interface ModelStore {
  /** Absolute file location of a model. */
  path(id: ModelId): string;
  /** Last known status. Call refresh() or check() first; before that every model reads 'missing'. */
  status(id: ModelId): ModelStatus;
  /** Re-checks every model (size, then SHA-256). Hashing 2.6 GB takes seconds: call on screen open, not per frame. */
  refresh(): Promise<void>;
  /** Best usable model in manifest order, skipping `skip`. Gemma 4 E2B first, then Gemma 3 1B. */
  check(skip?: readonly ModelId[]): Promise<ModelCheck>;
  /** Starts a download. Call it only from an explicit user tap. Never automatic. */
  download(id: ModelId): Promise<Result<true, DownloadFailure>>;
  cancelDownload(): void;
  subscribe(cb: () => void): () => void;
}

export function createModelStore(
  port: ModelFilePort,
  manifest: Readonly<Record<ModelId, ModelManifest>> = MODEL_MANIFEST,
): ModelStore {
  const statuses = new Map<ModelId, ModelStatus>();
  const listeners = new Set<() => void>();
  let downloading: ModelId | null = null;

  const path = (id: ModelId) => port.filesDirectory() + manifest[id].fileName;
  const status = (id: ModelId): ModelStatus => statuses.get(id) ?? { kind: 'missing' };
  const set = (id: ModelId, s: ModelStatus) => {
    statuses.set(id, s);
    listeners.forEach((cb) => cb());
  };

  async function verify(id: ModelId): Promise<ModelStatus> {
    const m = manifest[id];
    const uri = path(id);
    const size = await port.fileSize(uri);
    if (size === null) return { kind: 'missing' };
    if (size !== m.sizeBytes) return { kind: 'invalid', reason: 'size' };
    const hash = await port.sha256(uri);
    if (hash === null) return { kind: 'ready', checksum: 'unchecked' }; // hashing failed: size matched only
    if (hash.toLowerCase() !== m.sha256) return { kind: 'invalid', reason: 'checksum' };
    return { kind: 'ready', checksum: 'verified' };
  }

  // The file being downloaded is not re-hashed by a concurrent check: its state is 'downloading'.
  async function recheck(id: ModelId): Promise<ModelStatus> {
    if (downloading === id) return status(id);
    const s = await verify(id);
    if (downloading !== id) set(id, s);
    return status(id);
  }

  return {
    path,
    status,
    async refresh() {
      for (const id of MODEL_ORDER) await recheck(id);
    },
    async check(skip = []) {
      let invalid: ModelCheck | null = null;
      for (const id of MODEL_ORDER) {
        if (skip.includes(id)) continue;
        const s = await recheck(id);
        if (s.kind === 'ready') return { kind: 'ready', modelId: id, path: path(id), checksum: s.checksum };
        // A wrong-size or wrong-hash file cannot be loaded: PL_NO_MODEL, like a missing one.
        if (s.kind === 'invalid') invalid ??= { kind: 'invalid', code: 'PL_NO_MODEL', reason: s.reason };
      }
      return invalid ?? { kind: 'missing', code: 'PL_NO_MODEL' };
    },
    async download(id) {
      const m = manifest[id];
      if (m.url === null) return { ok: false, error: 'NO_URL' };
      if (!m.url.startsWith('https://')) return { ok: false, error: 'BAD_URL' };
      if (downloading !== null) return { ok: false, error: 'BUSY' };
      downloading = id;
      set(id, { kind: 'downloading', receivedBytes: 0, totalBytes: m.sizeBytes });
      const off = port.onProgress((receivedBytes, totalBytes) => {
        if (downloading === id) set(id, { kind: 'downloading', receivedBytes, totalBytes });
      });
      const res = await port.download(m.url, path(id), m.sizeBytes, m.sha256);
      off();
      downloading = null;
      // The module renames the file only after size and SHA-256 match, and deletes the part file on a mismatch.
      if (res.ok) set(id, { kind: 'ready', checksum: 'verified' });
      else set(id, await verify(id)); // keeps any earlier valid file; a cancelled part file is not a model
      return res;
    },
    cancelDownload: () => port.cancelDownload(),
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
