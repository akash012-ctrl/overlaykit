import { requireNativeModule } from 'expo';

/** Strings and numbers only. No LiteRT-LM type crosses into JavaScript (design.md DD-9). */
export type LlmLoadResult =
  | { ok: true }
  | { ok: false; code: 'NO_FILE' | 'OUT_OF_MEMORY' | 'UNSUPPORTED' | 'FAILED' };

export type LlmGenerateResult =
  | { ok: true; text: string }
  | { ok: false; code: 'CANCELLED' | 'NOT_LOADED' | 'FAILED' };

export type LlmDownloadResult =
  | { ok: true; path: string }
  | {
      ok: false;
      code:
        | 'BAD_URL' // not https, or a redirect left https
        | 'BUSY' // another download is running
        | 'OFFLINE' // no route, DNS failure or timeout
        | 'NO_SPACE' // not enough free space before the first byte
        | 'HTTP' // the server answered with an error status
        | 'SIZE_MISMATCH' // size differs from expectedSize; the .part file is deleted
        | 'HASH_MISMATCH' // SHA-256 differs; the .part file is deleted
        | 'CANCELLED' // cancelDownload(); the .part file is kept so the next call resumes
        | 'FAILED';
    };

export type LlmDownloadProgress = { receivedBytes: number; totalBytes: number };

type OverlaykitLlmNative = {
  load(modelPath: string, options: { backend: 'cpu' | 'gpu'; maxTokens: number }): Promise<LlmLoadResult>;
  generate(
    requestId: string,
    system: string,
    user: string,
    schemaJson: string | null,
    maxOutputTokens: number,
  ): Promise<LlmGenerateResult>;
  cancel(requestId: string): void;
  release(): Promise<void>;

  /** App files directory with a trailing slash, as a plain path (no file:// prefix). */
  filesDirectory(): string;
  /** Size in bytes, or null when the file is missing or unreadable. */
  fileSize(path: string): Promise<number | null>;
  /** Lower-case hex SHA-256 of the file, or null when it can't be read. */
  sha256File(path: string): Promise<string | null>;
  /**
   * Downloads `url` (HTTPS only, no token) to `destPath` through `destPath + '.part'`, resuming
   * with an HTTP Range request. The file is renamed only after size and SHA-256 match.
   */
  downloadModel(
    url: string,
    destPath: string,
    expectedSize: number,
    expectedSha256: string,
  ): Promise<LlmDownloadResult>;
  cancelDownload(): void;

  addListener(event: 'onDownloadProgress', cb: (p: LlmDownloadProgress) => void): { remove(): void };
};

export default requireNativeModule<OverlaykitLlmNative>('OverlaykitLlm');
