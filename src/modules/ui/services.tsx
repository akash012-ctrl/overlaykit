import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { CaptureService } from '../capture';
import { createCaptureService } from '../capture';
import type { MachineService } from '../components';
import { createMachineService } from '../components';
import type { TranslationService } from '../locale';
import { getTranslationService } from '../locale';
import type { OcrService } from '../ocr';
import { createOcrService } from '../ocr';

/** Everything the camera screen talks to. Tests pass fakes (DD-1). */
export type CameraServices = {
  readonly capture: CaptureService;
  readonly ocr: OcrService;
  /** Language-pair routing, cache and limits. Settings come from useLocaleSettings. */
  readonly translation: TranslationService;
  readonly machines: MachineService;
};

const ServicesContext = createContext<CameraServices | null>(null);

let defaults: CameraServices | null = null;
/** Built once: they wrap native adapter instances, the only singletons allowed. */
function defaultServices(): CameraServices {
  if (!defaults) {
    const base: CameraServices = { capture: createCaptureService(), ocr: createOcrService(), translation: getTranslationService(), machines: createMachineService() };
    // QE-2 hooks exist only in development builds (DD-13, R21.6).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (DD-13)
    defaults = __DEV__ ? (require('./debug') as typeof import('./debug')).withFaultInjection(base) : base;
  }
  return defaults;
}

export function CameraServicesProvider({ services, children }: { services?: CameraServices; children: ReactNode }) {
  const value = useMemo(() => services ?? defaultServices(), [services]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useCameraServices(): CameraServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('CameraServicesProvider is missing');
  return services;
}
