import type { ModelManifest } from '../model-manifest';
import { MODEL_MANIFEST } from '../model-manifest';
import { createModelStore } from '../model-store';
import type { ModelFilePort } from '../model-store';

const BIG = MODEL_MANIFEST['gemma-4-e2b'] as ModelManifest;

function port(hash: () => Promise<string | null>): ModelFilePort {
  return {
    filesDirectory: () => 'file:///files/',
    fileSize: async (uri: string) => (uri.endsWith(BIG.fileName) ? BIG.sizeBytes : null),
    sha256: () => hash(),
    download: async () => ({ ok: false, error: 'FAILED' }),
    onProgress: () => () => undefined,
    cancelDownload: () => undefined,
  } as unknown as ModelFilePort;
}

describe('model store refresh', () => {
  it('marks a file of the right size ready before the hash finishes, then verified', async () => {
    let finish: (h: string) => void = () => undefined;
    const store = createModelStore(port(() => new Promise((resolve) => (finish = resolve))));
    const done = store.refresh();
    await new Promise((r) => setTimeout(r, 0));
    expect(store.status('gemma-4-e2b')).toEqual({ kind: 'ready', checksum: 'unchecked' });
    finish(BIG.sha256);
    await done;
    expect(store.status('gemma-4-e2b')).toEqual({ kind: 'ready', checksum: 'verified' });
  });

  it('still marks a wrong hash invalid', async () => {
    const store = createModelStore(port(async () => '0'.repeat(64)));
    await store.refresh();
    expect(store.status('gemma-4-e2b')).toEqual({ kind: 'invalid', reason: 'checksum' });
  });
});
