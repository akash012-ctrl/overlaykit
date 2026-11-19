// OVERLAYKIT_DEBUG_ONLY: QE-2 test hooks, loaded only behind __DEV__ (DD-13, R21.6).
import { DevSettings } from 'react-native';

import type { CameraServices } from '../services';

type Fault = 'CAM_CAPTURE_FAILED' | 'OCR_ENGINE_UNAVAILABLE' | 'OCR_RECOGNITION_FAILED';

/**
 * Wraps the services so the next call of the chosen kind fails once. Each fault
 * is armed from the React Native dev menu.
 */
export function withFaultInjection(base: CameraServices): CameraServices {
  const armed = new Set<Fault>();
  const take = (f: Fault) => armed.delete(f);
  for (const f of ['CAM_CAPTURE_FAILED', 'OCR_ENGINE_UNAVAILABLE', 'OCR_RECOGNITION_FAILED'] as const) {
    DevSettings.addMenuItem(`Fail next: ${f}`, () => armed.add(f));
  }
  return {
    ...base,
    capture: {
      ...base.capture,
      captureStill: (preview) =>
        take('CAM_CAPTURE_FAILED') ? Promise.resolve({ ok: false, error: 'CAM_CAPTURE_FAILED' }) : base.capture.captureStill(preview),
    },
    ocr: Object.assign(Object.create(base.ocr) as typeof base.ocr, {
      checkEngine: () =>
        take('OCR_ENGINE_UNAVAILABLE') ? Promise.resolve({ ok: false, error: 'OCR_ENGINE_UNAVAILABLE' } as const) : base.ocr.checkEngine(),
      recognize: (frame: Parameters<typeof base.ocr.recognize>[0]) =>
        take('OCR_RECOGNITION_FAILED')
          ? Promise.resolve({ ok: false, error: 'OCR_RECOGNITION_FAILED' } as const)
          : base.ocr.recognize(frame),
    }),
  };
}

/** Release-bundle search marker (R21.6). */
export const DEBUG_MARKER_FAULT_INJECTION = 'OVERLAYKIT_DEBUG_ONLY';
