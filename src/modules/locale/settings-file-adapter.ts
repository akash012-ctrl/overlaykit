// The only file in locale that imports the file-system package (lint VENDOR_OWNERS).
import { File, Paths } from 'expo-file-system';

/** One small text file. No method throws. */
export interface SettingsFilePort {
  /** The file's text, or null when it is missing or unreadable. */
  read(): Promise<string | null>;
  /** Writes a temp file, then renames it over the real one. Returns false on any failure. */
  writeAtomic(text: string): Promise<boolean>;
}

const FILE_NAME = 'overlaykit-settings.json';

export function createExpoSettingsFilePort(): SettingsFilePort {
  const finalFile = () => new File(Paths.document, FILE_NAME);
  const tempFile = () => new File(Paths.document, `${FILE_NAME}.tmp`);
  return {
    async read() {
      try {
        const file = finalFile();
        return file.exists ? await file.text() : null;
      } catch {
        return null;
      }
    },
    async writeAtomic(text) {
      try {
        const temp = tempFile();
        if (temp.exists) temp.delete();
        temp.create();
        // write() and move() are async in expo-file-system 58: the move must wait for the bytes.
        await temp.write(text);
        await temp.move(finalFile(), { overwrite: true });
        return true;
      } catch {
        return false;
      }
    },
  };
}
