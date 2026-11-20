import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraPreview, StillView } from '../../capture';
import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { ExplorePanel } from '../explore/ExplorePanel';
import { GuideScreen } from '../guide';
import { FadeInView } from '../motion/motion';
import { resolveBack } from '../nav/back';
import { useBackHandler } from '../nav/useBackHandler';
import { OverlayLayer } from '../overlay/OverlayLayer';
import { Button, Card, IconTile, Title } from '../parts';
import type { CameraServices } from '../services';
import { CameraServicesProvider, useCameraServices } from '../services';
import { PrivacyNote } from '../settings/PrivacyNote';
import { colors, fontSize, lineHeight, radius, size, spacing } from '../theme';
import { ModeSwitcher } from './ModeSwitcher';
import { useCameraScreen } from './useCameraScreen';

// Debug tools are required only in development builds; release bundles never include them (R21.6).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (DD-13)
const DebugTools = __DEV__ ? (require('../debug') as typeof import('../debug')) : null;

/** States where the camera shows nothing useful: a centred card replaces the top status line. */
const BLOCKED = new Set(['permission-denied', 'permission-blocked', 'camera-unavailable', 'engine-unavailable']);

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
  const blocked = BLOCKED.has(view.kind);
  // Live reading replaces the 'take a photo' prompt while the preview is up (D-054).
  const statusText =
    view.kind === 'preview' && state.mode !== 'guide' && !stillShown
      ? t(state.live && state.items.length > 0 ? 'live.reading' : 'live.looking')
      : t(view.messageKey);
  // In Guide the dock gives the instructions; the top line shows only a problem to act on.
  const showStatus = !blocked && (state.mode !== 'guide' || view.action !== null);
  const overlayShown = (stillShown && shownFrame !== null) || state.live;

  return (
    <View style={styles.root} onLayout={(e) => actions.onStillLayout(e.nativeEvent.layout)}>
      <CameraPreview ref={previewRef} active={state.previewActive} onStateChange={actions.onCameraState} />
      {stillShown && shownFrame ? <StillView frame={shownFrame} onLayout={actions.onStillLayout} /> : null}
      {overlayShown ? (
        <OverlayLayer
          items={state.items}
          region={state.region}
          live={state.live}
          explore={state.mode === 'explore' ? explore : undefined}
          onRetry={actions.retryLabel}
        />
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

      {blocked ? (
        <View style={[styles.blockedHost, { paddingTop: insets.top, paddingBottom: state.layout.bars.bottom }]} pointerEvents="box-none">
          <FadeInView>
            <Card style={styles.stateCard}>
              <IconTile icon={view.kind === 'engine-unavailable' ? 'error' : 'cameraOff'} />
              <View accessibilityLiveRegion="polite">
                <Title center>{t(view.messageKey)}</Title>
              </View>
              {view.action ? (
                <Button
                  variant="primary"
                  size="lg"
                  stretch
                  label={t(view.action.labelKey)}
                  onPress={() => view.action && actions.runAction(view.action.kind)}
                />
              ) : null}
            </Card>
          </FadeInView>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm, paddingLeft: insets.left + spacing.md, paddingRight: insets.right + spacing.md }]}
        onLayout={(e) => actions.onTopBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.top))}
      >
        <View style={styles.topRow} pointerEvents="box-none">
          {showStatus ? (
            <View style={styles.statusPill}>
              {state.live && state.items.length > 0 ? <View style={styles.liveDot} /> : null}
              <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                {statusText}
              </Text>
            </View>
          ) : (
            <View style={styles.flex} />
          )}
          <A11yButton
            label={t('settings.open')}
            onPress={() => router.push('/settings')}
            icon="settings"
            iconSize={size.iconLg}
            iconOnly
            style={styles.iconButton}
          />
        </View>
        {view.action && !blocked && showStatus ? (
          <Button
            icon="retry"
            label={t(view.action.labelKey)}
            onPress={() => view.action && actions.runAction(view.action.kind)}
            style={styles.actionButton}
          />
        ) : null}
      </View>

      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }]}
        onLayout={(e) => actions.onBottomBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.bottom))}
      >
        {DebugTools && stillShown && shownFrame ? (
          <DebugTools.SnapshotExportButton frame={shownFrame} result={state.lastResult} layout={state.layout} ocr={services.ocr} />
        ) : null}
        {overlayShown && state.mode === 'explore' ? (
          <ExplorePanel
            view={explore.view}
            list={explore.list}
            prompt={explore.prompt}
            onRequest={explore.request}
            onClose={explore.close}
          />
        ) : null}
        <ModeSwitcher enabled={view.translateEnabled} mode={state.mode} onChange={actions.setMode} />
        {state.mode === 'guide' ? null : (
          <View style={styles.shutterSlot}>
            {stillShown ? (
              <Button variant="secondary" size="lg" icon="close" label={t('action.closeStill')} onPress={actions.dismissStill} />
            ) : (
              <A11yButton
                label={t(state.live ? 'action.hold' : 'action.capture')}
                disabled={!view.captureEnabled}
                onPress={() => void actions.takePhoto()}
                iconOnly
                pressScale
                style={[styles.shutter, !view.captureEnabled && styles.disabled]}
              >
                <View style={styles.shutterDisc} />
              </A11yButton>
            )}
          </View>
        )}
      </View>
      {state.privacy.loaded && !state.privacy.acknowledged ? (
        <View style={[styles.privacy, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
  flex: { flex: 1 },
  guideHost: { position: 'absolute', left: 0, right: 0, top: 0 },
  blockedHost: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingHorizontal: spacing.lg },
  stateCard: { gap: spacing.lg, paddingVertical: spacing.xl },
  privacy: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: spacing.lg },
  // No bar at the top: the camera shows through. The pill and the gear carry their own backing.
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: spacing.sm, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: size.touch,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentText },
  statusText: { flex: 1, color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body },
  iconButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  actionButton: { alignSelf: 'flex-start' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.outline,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  shutterSlot: { height: size.shutter, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: size.shutter,
    height: size.shutter,
    borderRadius: size.shutter / 2,
    borderWidth: 4,
    borderColor: colors.text,
  },
  shutterDisc: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.text },
  disabled: { opacity: 0.4 },
});
