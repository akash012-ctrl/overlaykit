// The two on-device models (D-048, D-049). Size and SHA-256 re-read from the Hugging Face API
// (GET /api/models/<repo>?blobs=true, lfs.sha256 and size) on 2026-11-19 before pinning.
// Gemma 4 E2B: public, Apache-2.0, gated false: no account and no token. The app downloads it
// only on an explicit user tap. Gemma 3 1B: gated, sideload only, so it has no URL here.
export type ModelId = 'gemma-4-e2b' | 'gemma-3-1b';

export type ModelManifest = {
  readonly id: ModelId;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  /** HTTPS download URL, or null when the file can only be pushed by the owner. */
  readonly url: string | null;
  readonly license: string;
  readonly gated: boolean;
};

export const MODEL_MANIFEST: Readonly<Record<ModelId, ModelManifest>> = {
  'gemma-4-e2b': {
    id: 'gemma-4-e2b',
    fileName: 'gemma-4-E2B-it.litertlm',
    sizeBytes: 2_588_147_712,
    sha256: '181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c',
    url: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm',
    license: 'Apache-2.0',
    gated: false,
  },
  'gemma-3-1b': {
    id: 'gemma-3-1b',
    fileName: 'gemma3-1b-it-int4.litertlm',
    sizeBytes: 584_417_280,
    sha256: '1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be',
    url: null,
    license: 'Gemma Terms of Use',
    gated: true,
  },
};

/** Preference order: the default first, the small fallback second. */
export const MODEL_ORDER: readonly ModelId[] = ['gemma-4-e2b', 'gemma-3-1b'];
