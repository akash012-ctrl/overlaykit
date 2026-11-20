import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraPreview, StillView } from '../../capture';
import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { ExplorePanel } from '../explore/ExplorePanel';
import { GuideScreen } from '../guide';
import { resolveBack } from '../nav/back';
import { useBackHandler } from '../nav/useBackHandler';
import { OverlayLayer } from '../overlay/OverlayLayer';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import type { CameraServices } from '../services';
import { colors, fontSize, radius, spacing } from '../theme';
import { CameraServicesProvider, useCameraServices } from '../services';
import { PrivacyNote } from '../settings/PrivacyNote';
import { ModeSwitcher } from './ModeSwitcher';
import { useCameraScreen } from './useCameraScreen';

// Debug tools are required only in development builds; release bundles never include them (R21.6).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (DD-13)
const DebugTools = __DEV__ ? (require('../debug') as typeof import('../debug')) : null;

const BAR_BACKGROUND = colors.bar;
const PRIMARY_BUTTON_HEIGHT_DP = 56;

function Screen() {
  const services = useCameraServices();
  const insets = useSafeAreaInsets();
  const { state, previewRef, actions } = useCameraScreen(services, insets);
  const { view, shownFrame, explore } = state;
  const router = useRouter();
  const stillShown =
    shownFrame !== null &&
    (view.kind === 'reading' || view.kind === 'still' || view.kind === 'no-text' || view.kind === 'recognition-failed');
  const resolve = useCallback(() => resolveBack({ mode: state.mode, stillShown }), [state.mode, stillShown]);
  const runBack = useCallback(
    (action: 'leave-guide' | 'close-still') => (action === 'leave-guide' ? actions.setMode('translate') : actions.dismissStill()),
    [actions],
  );
  useBackHandler(resolve, runBack);
  // Live reading replaces the 'take a photo' prompt while the preview is up (D-054).
  const statusText =
    view.kind === 'preview' && state.mode !== 'guide' && !stillShown
      ? t(state.live && state.items.length > 0 ? 'live.reading' : 'live.looking')
      : t(view.messageKey);

  return (
    <View style={styles.root} onLayout={(e) => actions.onStillLayout(e.nativeEvent.layout)}>
      <CameraPreview ref={previewRef} active={state.previewActive} onStateChange={actions.onCameraState} />
      {stillShown && shownFrame ? <StillView frame={shownFrame} onLayout={actions.onStillLayout} /> : null}
      {(stillShown && shownFrame) || state.live ? (
        <>
          <OverlayLayer
            items={state.items}
            region={state.region}
            explore={state.mode === 'explore' ? explore : undefined}
            onRetry={actions.retryLabel}
          />
        </>
      ) : null}

      {state.mode === 'guide' ? (
        <View pointerEvents="box-none" style={[styles.guideHost, { bottom: state.layout.bars.bottom }]}>
          <GuideScreen
            deps={{
              capture: services.capture,
              ocr: services.ocr,
              getPreview: () => previewRef.current,
              viewSize: state.layout.view.width > 0 ? state.layout.view : null,
              region: state.region,
            }}
            onSwitchMode={actions.setMode}
          />
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.topBar, { paddingTop: insets.top + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
        onLayout={(e) => actions.onTopBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.top))}
      >
        <View style={styles.topRow} pointerEvents="box-none">
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {statusText}
          </Text>
          <A11yButton
            label={t('settings.open')}
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
            textStyle={styles.buttonText}
          />
        </View>
        {view.action ? (
          <A11yButton
            label={t(view.action.labelKey)}
            onPress={() => view.action && actions.runAction(view.action.kind)}
            style={styles.actionButton}
            textStyle={styles.buttonText}
          />
        ) : null}
      </View>

      <View
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
        onLayout={(e) => actions.onBottomBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.bottom))}
      >
        {DebugTools && stillShown && shownFrame ? (
          <DebugTools.SnapshotExportButton frame={shownFrame} result={state.lastResult} layout={state.layout} ocr={services.ocr} />
        ) : null}
        {(stillShown || state.live) && state.mode === 'explore' ? (
          <ExplorePanel
            view={explore.view}
            list={explore.list}
            prompt={explore.prompt}
            onRequest={explore.request}
            onClose={explore.close}
          />
        ) : null}
        <ModeSwitcher enabled={view.translateEnabled} mode={state.mode} onChange={actions.setMode} />
        {state.mode === 'guide' ? (
          // Keeps the bar the same height in every mode, so the Guide dock does not jump when the mode changes.
          <View style={styles.primarySlot} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
        ) : stillShown ? (
          <A11yButton
            label={t('action.closeStill')}
            onPress={actions.dismissStill}
            style={styles.primaryButton}
            textStyle={styles.buttonText}
          />
        ) : (
          <A11yButton
            label={t(state.live ? 'action.hold' : 'action.capture')}
            disabled={!view.captureEnabled}
            onPress={() => void actions.takePhoto()}
            style={[styles.primaryButton, !view.captureEnabled && styles.disabled]}
            textStyle={styles.buttonText}
          />
        )}
      </View>
      {state.privacy.loaded && !state.privacy.acknowledged ? (
        <View style={styles.privacy}>
          <PrivacyNote onDone={() => void actions.acknowledgePrivacy()} />
        </View>
      ) : null}
    </View>
  );
}

/** The index route's screen (R18.1). Tests pass fake services. */
export function CameraScreen({ services }: { services?: CameraServices }) {
  return (
    <SafeAreaProvider>
      <CameraServicesProvider services={services}>
        <Screen />
      </CameraServicesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  guideHost: { position: 'absolute', left: 0, right: 0, top: 0 },
  privacy: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  // No bar background at the top: the camera shows through. The message and buttons carry their own backing.
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 10, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BAR_BACKGROUND, paddingTop: 10, gap: 10 },
  message: { flex: 1, color: colors.text, fontSize: fontSize.body, lineHeight: 24, backgroundColor: BAR_BACKGROUND, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
  settingsButton: { minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: BAR_BACKGROUND },
  actionButton: { alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.neutral },
  primaryButton: { minHeight: PRIMARY_BUTTON_HEIGHT_DP, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primary },
  primarySlot: { minHeight: PRIMARY_BUTTON_HEIGHT_DP },
  disabled: { backgroundColor: colors.neutral },
  buttonText: { color: colors.text, fontSize: fontSize.body, fontWeight: '600', lineHeight: 24 },
});
