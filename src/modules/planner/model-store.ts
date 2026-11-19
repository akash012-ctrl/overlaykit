// Finds the sideloaded model file and checks it (D-048). No network code, no download,
// and it never deletes or moves the owner's file: the port has no write methods.
import type { PlErrorCode } from '../shared';
import { MODEL_MANIFEST, type ModelManifest } from './model-manifest';

/**
 * File access the store needs. An implementation lives outside planner, because only
 * one file per vendor may import it (lint VENDOR_OWNERS). Methods never throw.
 */
export interface ModelFilePort {
  /** App files directory, with a trailing slash. */
  filesDirectory(): string;
  /** Size in bytes, or null when the file doesn't exist or can't be read. */
  fileSize(uri: string): Promise<number | null>;
  /**
   * Lower-case hex SHA-256 of the whole file, or null when this port can't hash.
   * Gap: expo-file-system has no streaming hash, so the Kotlin module (MessageDigest)
   * is expected to provide it (DQ-1). Until then the store reports checksum 'unchecked'.
   */
  sha256(uri: string): Promise<string | null>;
}

export type ModelCheck =
  | { readonly kind: 'missing'; readonly code: 'PL_NO_MODEL' }
  | { readonly kind: 'invalid'; readonly code: PlErrorCode; readonly reason: 'size' | 'checksum' }
  | { readonly kind: 'ready'; readonly path: string; readonly checksum: 'verified' | 'unchecked' };

export interface ModelStore {
  /** Absolute location the owner pushes the file to. */
  path(): string;
  check(): Promise<ModelCheck>;
}

export function createModelStore(port: ModelFilePort, manifest: ModelManifest = MODEL_MANIFEST): ModelStore {
  const path = () => port.filesDirectory() + manifest.fileName;
  return {
    path,
    async check() {
      const uri = path();
      const size = await port.fileSize(uri);
      if (size === null) return { kind: 'missing', code: 'PL_NO_MODEL' };
      // A wrong-size file cannot be loaded, so it maps to PL_NO_MODEL like a missing one.
      if (size !== manifest.sizeBytes) return { kind: 'invalid', code: 'PL_NO_MODEL', reason: 'size' };
      const hash = await port.sha256(uri);
      if (hash === null) return { kind: 'ready', path: uri, checksum: 'unchecked' };
      if (hash.toLowerCase() !== manifest.sha256) return { kind: 'invalid', code: 'PL_NO_MODEL', reason: 'checksum' };
      return { kind: 'ready', path: uri, checksum: 'verified' };
    },
  };
}
