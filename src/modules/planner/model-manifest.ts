// The one model the app accepts (D-048). The owner sideloads it with adb push.
// No URL here on purpose: the app never downloads it.
export const MODEL_MANIFEST = {
  fileName: 'gemma3-1b-it-int4.litertlm',
  sizeBytes: 584_417_280,
  sha256: '1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be',
} as const;

export type ModelManifest = {
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly sha256: string;
};
