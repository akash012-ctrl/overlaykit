// The only file that imports the translation binding (D-053).
import OverlaykitTranslate from '../../../../modules/overlaykit-translate';

import type { OnDeviceEngine } from './on-device';

/** ML Kit on-device translation, or null when the native module is not in this build. */
export function createMlKitTranslateEngine(): OnDeviceEngine | null {
  const native = OverlaykitTranslate;
  if (!native) return null;
  return {
    id: 'mlkit-translate@17.0.3 (on-device)',
    isModelReady: (pair) => native.isModelReady(pair.source, pair.target),
    async downloadModel(pair) {
      const r = await native.downloadModel(pair.source, pair.target);
      return r.ok ? { ok: true, value: undefined } : { ok: false, error: r.code === 'OFFLINE' ? 'OFFLINE' : 'FAILED' };
    },
    async translate(texts, pair) {
      const r = await native.translate([...texts], pair.source, pair.target);
      return r.ok ? { ok: true, value: r.texts } : { ok: false, error: r.code === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'FAILED' };
    },
  };
}
