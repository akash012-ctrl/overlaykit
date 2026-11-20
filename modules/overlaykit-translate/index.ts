import { requireOptionalNativeModule } from 'expo';

type Fail = { ok: false; code: 'OFFLINE' | 'UNSUPPORTED' | 'FAILED' };

export type OverlaykitTranslateNative = {
  isModelReady(source: string, target: string): Promise<boolean>;
  downloadModel(source: string, target: string): Promise<{ ok: true } | Fail>;
  translate(texts: string[], source: string, target: string): Promise<{ ok: true; texts: string[] } | Fail>;
};

/** null where the native module is missing (Jest, a build without it). */
export default requireOptionalNativeModule<OverlaykitTranslateNative>('OverlaykitTranslate');
