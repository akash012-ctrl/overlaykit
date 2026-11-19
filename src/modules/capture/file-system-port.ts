// The only file that imports the file-system package (D-036, lint VENDOR_OWNERS).
import { Directory, File, Paths } from 'expo-file-system';

export type StillDeleteOutcome = 'deleted' | 'missing' | 'failed';

/** File operations capture needs, in vendor-neutral form. No method throws. */
export interface FileSystemPort {
  cacheDirectory(): string;
  documentDirectory(): string;
  ensureDirectory(uri: string): Promise<boolean>;
  move(from: string, to: string): Promise<boolean>;
  copy(from: string, to: string): Promise<boolean>;
  writeText(uri: string, text: string): Promise<boolean>;
  delete(uri: string): Promise<StillDeleteOutcome>;
  /** File names in the directory. Empty when it doesn't exist or can't be read. */
  list(directoryUri: string): Promise<readonly string[]>;
}

export function createExpoFileSystemPort(): FileSystemPort {
  return {
    cacheDirectory: () => Paths.cache.uri,
    documentDirectory: () => Paths.document.uri,
    async ensureDirectory(uri) {
      try {
        const directory = new Directory(uri);
        if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
        return true;
      } catch {
        return false;
      }
    },
    async move(from, to) {
      try {
        new File(from).move(new File(to));
        return true;
      } catch {
        return false;
      }
    },
    async copy(from, to) {
      try {
        new File(from).copy(new File(to));
        return true;
      } catch {
        return false;
      }
    },
    async writeText(uri, text) {
      try {
        new File(uri).write(text);
        return true;
      } catch {
        return false;
      }
    },
    async delete(uri) {
      try {
        const file = new File(uri);
        if (!file.exists) return 'missing';
        file.delete();
        return 'deleted';
      } catch {
        return 'failed';
      }
    },
    async list(directoryUri) {
      try {
        const directory = new Directory(directoryUri);
        if (!directory.exists) return [];
        return directory.list().map((entry) => entry.name);
      } catch {
        return [];
      }
    },
  };
}
