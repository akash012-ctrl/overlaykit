import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, PixelRatio } from 'react-native';

import type { CameraState, PreviewHandle } from '../../capture';
import type { ControlBars, Insets } from '../../geometry';
import { useLocaleSettings } from '../../locale';
import type { FrameRef, OcrResult, Size } from '../../shared';
import type { OverlayItem, OverlayLayout } from '../overlay/build-items';
import { buildOverlayItems } from '../overlay/build-items';
import { useExplore } from '../explore/useExplore';
import type { FreezeOverlayState } from '../overlay/freeze-overlay';
import { EMPTY_FREEZE_OVERLAY, freezeOverlayReducer } from '../overlay/freeze-overlay';
import type { CameraServices } from '../services';
import { withLabels } from '../translate/to-label-state';
import { useTranslation } from '../translate/useTranslation';
import type { Mode } from './ModeSwitcher';
import { INITIAL_SCREEN_MODEL, previewActive, screenReducer, toScreenView } from './screen-model';

const NO_SIZE: Size = { width: 0, height: 0 };
const NO_BARS: ControlBars = { top: 0, bottom: 0 };

/**
 * Pause between live reads (D-054). One read is a silent still, OCR and translation, about a second on the
 * reference phone, so labels refresh roughly once a second. ponytail: still-capture loop; a CameraX frame
 * analyser would refresh faster if that ever matters.
 */
export const LIVE_READ_PAUSE_MS = 300;

/**
 * Translate mode hides lines already in the target language: the photo shows them as they are. While live it also
 * hides lines in a script the camera cannot read, which are mostly noise (key caps, logos); a held photo shows them.
 */
export function itemsForMode(items: readonly OverlayItem[], mode: Mode, live: boolean): readonly OverlayItem[] {
  if (mode !== 'translate') return items;
  return items.filter(
    (item) => !(item.state.kind === 'translated' && item.state.unchanged) && !(live && item.state.kind === 'unsupported'),
  );
}

/** A live frame replaces the labels on screen only once its translations settled, so labels do not flicker. */
export function nextLiveDisplay(prev: FreezeOverlayState, next: FreezeOverlayState): FreezeOverlayState {
  const settled = !next.sources.some((s) => s.label.kind === 'pending');
  return settled || prev.sources.length === 0 ? next : prev;
}

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
  /** True while the overlay shows a live frame (no still on screen). */
  const [liveShown, setLiveShown] = useState(false);
  const [liveDisplay, setLiveDisplay] = useState<FreezeOverlayState>(EMPTY_FREEZE_OVERLAY);
  const previewRef = useRef<PreviewHandle | null>(null);
  /** The latest live still, kept on disk so the shutter can hold it at once. Released when the next one lands. */
  const liveHeld = useRef<FrameRef | null>(null);
  /** One camera capture at a time: the live loop and the shutter share the camera. */
  const captureChain = useRef<Promise<unknown>>(Promise.resolve());
  // Latest state for async handlers. Synced after each commit, never during render.
  const modelRef = useRef(model);
  const overlayRef = useRef(overlay);
  const lastResultRef = useRef(lastResult);
  useEffect(() => {
    modelRef.current = model;
    overlayRef.current = overlay;
    lastResultRef.current = lastResult;
  }, [model, overlay, lastResult]);

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
        liveHeld.current = null;
        setLiveShown(false);
        setLiveDisplay(EMPTY_FREEZE_OVERLAY);
        setLastResult(null);
        void capture.purgeStills();
      }
    });
    return () => subscription.remove();
  }, [capture, refreshPermission]);

  const onCameraState = useCallback((state: CameraState) => dispatch({ type: 'camera-changed', state }), []);

  const captureOnce = useCallback(() => {
    const run = () => capture.captureStill(previewRef.current);
    const next = captureChain.current.then(run, run);
    captureChain.current = next.catch(() => undefined);
    return next;
  }, [capture]);

  const dismissStill = useCallback(() => {
    const shown = overlayRef.current.shown;
    const held = liveHeld.current;
    liveHeld.current = null;
    setLiveShown(false);
    setLiveDisplay(EMPTY_FREEZE_OVERLAY);
    dispatch({ type: 'still-dismissed' });
    dispatchOverlay({ type: 'still-dismissed' });
    setLastResult(null);
    if (shown) void capture.releaseStill(shown);
    if (held && held.frameId !== shown?.frameId) void capture.releaseStill(held);
  }, [capture]);

  // Live reading (D-054): while the preview is up in Translate or Explore, read and translate on a loop.
  const screenView = toScreenView(model);
  const liveOn =
    model.appActive &&
    mode !== 'guide' &&
    model.flow.kind === 'preview' &&
    screenView.captureEnabled &&
    settings.loaded &&
    settings.privacyAcknowledged;
  useEffect(() => {
    if (!liveOn) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async (): Promise<void> => {
      const shot = await captureOnce();
      if (shot.ok) {
        const read = stopped ? null : await ocr.recognize(shot.value);
        // A read that lands after the loop stopped (shutter, mode change, background) is dropped.
        if (stopped || read === null || !read.ok || modelRef.current.flow.kind !== 'preview') {
          void capture.releaseStill(shot.value);
        } else {
          const prev = liveHeld.current;
          liveHeld.current = shot.value;
          dispatchOverlay({ type: 'still-shown', frame: shot.value });
          dispatchOverlay({ type: 'result-applied', result: read.value });
          setLastResult(read.value);
          setLiveShown(true);
          if (prev) void capture.releaseStill(prev);
        }
      }
      if (!stopped) timer = setTimeout(() => void tick(), LIVE_READ_PAUSE_MS);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [liveOn, captureOnce, capture, ocr]);

  const takePhoto = useCallback(async () => {
    const current = modelRef.current;
    if (!toScreenView(current).captureEnabled) return;
    // Hold: the live frame on screen becomes the still at once, with its labels, instead of a new capture.
    const held = liveHeld.current;
    const heldResult = lastResultRef.current;
    if (held && heldResult && heldResult.frameId === held.frameId && overlayRef.current.shown?.frameId === held.frameId) {
      liveHeld.current = null;
      setLiveShown(false);
      dispatch({ type: 'capture-started' });
      dispatch({ type: 'capture-finished', result: { ok: true, value: held } });
      dispatch({ type: 'ocr-finished', frameId: held.frameId, result: { ok: true, value: heldResult } });
      return;
    }
    dispatch({ type: 'capture-started' });
    const result = await captureOnce();
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
  }, [capture, captureOnce, ocr]);

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
  // Set during render, guarded by the overlay it was computed from, so it settles in one extra pass.
  const [liveSeen, setLiveSeen] = useState(shownOverlay);
  if (liveShown && liveSeen !== shownOverlay) {
    setLiveSeen(shownOverlay);
    setLiveDisplay((prev) => nextLiveDisplay(prev, shownOverlay));
  }
  const drawnOverlay = liveShown ? liveDisplay : shownOverlay;
  const built = useMemo(() => buildOverlayItems(drawnOverlay, layout), [drawnOverlay, layout]);
  const items = useMemo(() => (built.ok ? built.value.items : []), [built]);
  const drawnItems = useMemo(() => itemsForMode(items, mode, liveShown), [items, mode, liveShown]);
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
      view: screenView,
      previewActive: previewActive(model),
      shownFrame: overlay.shown,
      lastResult,
      layout,
      items: drawnItems,
      /** Labels are live (over the moving preview), not on a held still. */
      live: liveShown,
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
      // Guide works on the live preview, so a shown still is closed first.
      setMode: (next: Mode) => {
        if (next === 'guide') dismissStill();
        setMode(next);
      },
      retryLabel: (id: string) => retry([id]),
      acknowledgePrivacy: settings.acknowledgePrivacy,
    },
  };
}
