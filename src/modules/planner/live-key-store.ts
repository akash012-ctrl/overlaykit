// The user's Google API key for Gemini Live (spec 05 task 19.3, requirement 17, D-050).
// The only file that imports expo-secure-store. The key never goes in a log, the repo or an error.
import * as SecureStore from 'expo-secure-store';
import type { Result } from '../shared';

// SecureStore key names allow letters, digits, ".", "-" and "_".
const STORE_KEY = 'overlaykit.google_live_key';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

// The key goes into a URL query in session.ts, so only URL-safe characters are accepted.
// shortcut: format check only (16 to 128 of A-Z a-z 0-9 _ -); Google decides if the key works.
const KEY_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;

export type LiveKeyError = 'PL_LIVE_NO_KEY' | 'PL_LIVE_AUTH';

export interface LiveKeyStore {
  /** The key, for the socket URL builder only. */
  get(): Promise<Result<string, 'PL_LIVE_NO_KEY'>>;
  /** Trims, checks the shape, saves. PL_LIVE_AUTH: bad shape. PL_LIVE_NO_KEY: storage failed. */
  set(key: string): Promise<Result<void, LiveKeyError>>;
  remove(): Promise<Result<void, 'PL_LIVE_NO_KEY'>>;
  /** For display: "••••" plus the last four characters. */
  masked(): Promise<Result<string, 'PL_LIVE_NO_KEY'>>;
  /** Last known answer, false until the first read or save finishes. */
  hasKey(): boolean;
  subscribe(cb: (hasKey: boolean) => void): () => void;
}

export function createLiveKeyStore(): LiveKeyStore {
  let known = false;
  const listeners = new Set<(hasKey: boolean) => void>();
  const setKnown = (v: boolean): void => {
    if (v === known) return;
    known = v;
    listeners.forEach((cb) => cb(v));
  };

  async function read(): Promise<string | null> {
    try {
      const v = await SecureStore.getItemAsync(STORE_KEY, OPTIONS);
      setKnown(v !== null && v !== '');
      return v === '' ? null : v;
    } catch {
      return null;
    }
  }

  const store: LiveKeyStore = {
    async get() {
      const v = await read();
      return v === null ? { ok: false, error: 'PL_LIVE_NO_KEY' } : { ok: true, value: v };
    },
    async set(key) {
      const k = key.trim();
      if (!KEY_SHAPE.test(k)) return { ok: false, error: 'PL_LIVE_AUTH' };
      try {
        await SecureStore.setItemAsync(STORE_KEY, k, OPTIONS);
      } catch {
        return { ok: false, error: 'PL_LIVE_NO_KEY' };
      }
      setKnown(true);
      return { ok: true, value: undefined };
    },
    async remove() {
      try {
        await SecureStore.deleteItemAsync(STORE_KEY, OPTIONS);
      } catch {
        return { ok: false, error: 'PL_LIVE_NO_KEY' };
      }
      setKnown(false);
      return { ok: true, value: undefined };
    },
    async masked() {
      const v = await read();
      return v === null ? { ok: false, error: 'PL_LIVE_NO_KEY' } : { ok: true, value: `\u2022\u2022\u2022\u2022${v.slice(-4)}` };
    },
    hasKey: () => known,
    subscribe(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
  return store;
}
