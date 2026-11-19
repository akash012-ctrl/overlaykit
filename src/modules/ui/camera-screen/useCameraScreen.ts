import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, PixelRatio } from 'react-native';

import type { CameraState, PreviewHandle } from '../../capture';
import type { ControlBars, Insets } from '../../geometry';
import { useLocaleSettings } from '../../locale';
import type { OcrResult, Size } from '../../shared';
import type { OverlayLayout } from '../overlay/build-items';
import { buildOverlayItems } from '../overlay/build-items';
import { useExplore } from '../explore/useExplore';
import { EMPTY_FREEZE_OVERLAY, freezeOverlayReducer } from '../overlay/freeze-overlay';
import type { CameraServices } from '../services';
import { withLabels } from '../translate/to-label-state';
import { useTranslation } from '../translate/useTranslation';
import type { Mode } from './ModeSwitcher';
import { INITIAL_SCREEN_MODEL, previewActive, screenReducer, toScreenView } from './screen-model';

const NO_SIZE: Size = { width: 0, height: 0 };
const NO_BARS: ControlBars = { top: 0, bottom: 0 };

/**
 * Wires capture → ocr → locale → geometry for the freeze-frame flow (design.md,
 * "Freeze-frame flow"). Async work runs in event handlers, not effects, so
 * StrictMode can't send a request twice. View positions are derived from the
 * current layout on every render (DD-6), so any layout change moves them (R14).
 */
export function useCameraScreen(services: CameraServices, insets: Insets) {
  const [model, dispatch] = useReducer(screenReducer, INITIAL_SCREEN_MODEL);
  const [overlay, dispatchOverlay] = useReducer(freezeOverlayReducer, EMPTY_FREEZE_OVERLAY);
  const [viewSize, setViewSize] = useState<Size>(NO_SIZE);
  const [bars, setBars] = useState<ControlBars>(NO_BARS);
  const [fontScale, setFontScale] = useState(() => PixelRatio.getFontScale());
  const [lastResult, setLastResult] = useState<OcrResult | null>(null);
  const [mode, setMode] = useState<Mode>('translate');
  const previewRef = useRef<PreviewHandle | null>(null);
  // Latest state for async handlers. Synced after each commit, never during render.
  const modelRef = useRef(model);
  const overlayRef = useRef(overlay);
  useEffect(() => {
    modelRef.current = model;
    overlayRef.current = overlay;
  }, [model, overlay]);

  const { capture, ocr, translation, machines } = services;
  const settings = useLocaleSettings();
  const { labels, retry } = useTranslation(lastResult, translation);

  const refreshPermission = useCallback(async () => {
    let state = await capture.readPermission();
    if (state.kind === 'undetermined') state = await capture.requestPermission(); // R1.1
    dispatch({ type: 'permission-changed', state });
  }, [capture]);

  // On mount: leftovers from earlier sessions (R4.5), the engine check (R8.6), permission (R1.1).
  useEffect(() => {
    void capture.purgeStills();
    void ocr.checkEngine().then((result) => dispatch({ type: 'engine-checked', result }));
    void refreshPermission();
  }, [capture, ocr, refreshPermission]);

  // Background releases the camera, deletes stills and clears overlays (R2.7, R4.4, R4.7).
  // Foreground re-reads the permission (R1.9) and the font scale.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!modelRef.current.appActive) {
          dispatch({ type: 'app-foreground' });
          setFontScale(PixelRatio.getFontScale());
          void refreshPermission();
        }
      } else if (state === 'background') {
        dispatch({ type: 'app-background' });
        dispatchOverlay({ type: 'cleared' });
        void capture.purgeStills();
      }
    });
    return () => subscription.remove();
  }, [capture, refreshPermission]);

  const onCameraState = useCallback((state: CameraState) => dispatch({ type: 'camera-changed', state }), []);

  const dismissStill = useCallback(() => {
    const shown = overlayRef.current.shown;
    dispatch({ type: 'still-dismissed' });
    dispatchOverlay({ type: 'still-dismissed' });
    setLastResult(null);
    if (shown) void capture.releaseStill(shown);
  }, [capture]);

  const takePhoto = useCallback(async () => {
    const current = modelRef.current;
    if (!toScreenView(current).captureEnabled) return;
    dispatch({ type: 'capture-started' });
    const result = await capture.captureStill(previewRef.current);
    // A capture that finishes after the flow moved on is released (screenReducer contract).
    if (modelRef.current.flow.kind !== 'capturing') {
      if (result.ok) void capture.releaseStill(result.value);
      return;
    }
    dispatch({ type: 'capture-finished', result });
    if (!result.ok) return;
    const frame = result.value;
    const replaced = overlayRef.current.shown;
    dispatchOverlay({ type: 'still-shown', frame });
    if (replaced) void capture.releaseStill(replaced); // R4.3

    const ocrResult = await ocr.recognize(frame);
    dispatch({ type: 'ocr-finished', frameId: frame.frameId, result: ocrResult });
    if (!ocrResult.ok) return;
    setLastResult(ocrResult.value);
    dispatchOverlay({ type: 'result-applied', result: ocrResult.value });
  }, [capture, ocr]);

  const runAction = useCallback(
    (kind: string) => {
      switch (kind) {
        case 'request-permission':
          void capture.requestPermission().then((state) => dispatch({ type: 'permission-changed', state }));
          return;
        case 'open-settings':
          void capture.openAppSettings();
          return;
        case 'retry-camera':
          dispatch({ type: 'retry-camera' });
          return;
        case 'retry-capture':
          void takePhoto();
          return;
        case 'back-to-preview':
          dismissStill();
          return;
      }
    },
    [capture, dismissStill, takePhoto],
  );

  const layout: OverlayLayout = useMemo(() => ({ view: viewSize, insets, bars, fontScale }), [viewSize, insets, bars, fontScale]);
  const shownOverlay = useMemo(() => withLabels(overlay, labels), [overlay, labels]);
  const built = useMemo(() => buildOverlayItems(shownOverlay, layout), [shownOverlay, layout]);
  const items = useMemo(() => (built.ok ? built.value.items : []), [built]);
  const explore = useExplore({
    active: mode === 'explore',
    machines,
    result: lastResult,
    shown: overlay.shown,
    viewSize,
    items,
    labels,
    uiLocale: settings.uiLocale,
  });

  const onTopBarHeight = useCallback((top: number) => setBars((b) => (b.top === top ? b : { ...b, top })), []);
  const onBottomBarHeight = useCallback((bottom: number) => setBars((b) => (b.bottom === bottom ? b : { ...b, bottom })), []);

  return {
    state: {
      view: toScreenView(model),
      previewActive: previewActive(model),
      shownFrame: overlay.shown,
      lastResult,
      layout,
      items,
      region: built.ok ? built.value.region : null,
      mode,
      explore,
      privacy: { loaded: settings.loaded, acknowledged: settings.privacyAcknowledged },
    },
    previewRef,
    actions: {
      onCameraState,
      onStillLayout: setViewSize,
      onTopBarHeight,
      onBottomBarHeight,
      takePhoto,
      dismissStill,
      runAction,
      setMode,
      retryLabel: (id: string) => retry([id]),
      acknowledgePrivacy: settings.acknowledgePrivacy,
    },
  };
}
