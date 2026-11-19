import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraPreview, StillView } from '../../capture';
import { t } from '../../locale';
import { ExplorePanel } from '../explore/ExplorePanel';
import { GuideScreen } from '../guide';
import { OverlayLayer } from '../overlay/OverlayLayer';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import type { CameraServices } from '../services';
import { CameraServicesProvider, useCameraServices } from '../services';
import { PrivacyNote } from '../settings/PrivacyNote';
import { ModeSwitcher } from './ModeSwitcher';
import { useCameraScreen } from './useCameraScreen';

// Debug tools are required only in development builds; release bundles never include them (R21.6).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (DD-13)
const DebugTools = __DEV__ ? (require('../debug') as typeof import('../debug')) : null;

const BAR_BACKGROUND = 'rgba(11,15,20,0.88)';

function Screen() {
  const services = useCameraServices();
  const insets = useSafeAreaInsets();
  const { state, previewRef, actions } = useCameraScreen(services, insets);
  const { view, shownFrame, explore } = state;
  const router = useRouter();
  const stillShown =
    shownFrame !== null &&
    (view.kind === 'reading' || view.kind === 'still' || view.kind === 'no-text' || view.kind === 'recognition-failed');

  return (
    <View style={styles.root} onLayout={(e) => actions.onStillLayout(e.nativeEvent.layout)}>
      <CameraPreview ref={previewRef} active={state.previewActive} onStateChange={actions.onCameraState} />
      {stillShown && shownFrame ? (
        <>
          <StillView frame={shownFrame} onLayout={actions.onStillLayout} />
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
        style={[styles.topBar, { paddingTop: insets.top + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
        onLayout={(e) => actions.onTopBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.top))}
      >
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {t(view.messageKey)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
          onPress={() => router.push('/settings')}
          style={styles.actionButton}
        >
          <Text style={styles.buttonText}>{t('settings.open')}</Text>
        </Pressable>
        {view.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(view.action.labelKey)}
            onPress={() => view.action && actions.runAction(view.action.kind)}
            style={styles.actionButton}
          >
            <Text style={styles.buttonText}>{t(view.action.labelKey)}</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
        onLayout={(e) => actions.onBottomBarHeight(Math.max(0, e.nativeEvent.layout.height - insets.bottom))}
      >
        {DebugTools && stillShown && shownFrame ? (
          <DebugTools.SnapshotExportButton frame={shownFrame} result={state.lastResult} layout={state.layout} ocr={services.ocr} />
        ) : null}
        {stillShown && state.mode === 'explore' ? (
          <ExplorePanel
            view={explore.view}
            list={explore.list}
            prompt={explore.prompt}
            onRequest={explore.request}
            onClose={explore.close}
          />
        ) : null}
        <ModeSwitcher enabled={view.translateEnabled} mode={state.mode} onChange={actions.setMode} />
        {state.mode === 'guide' ? null : stillShown ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('action.closeStill')}
            onPress={actions.dismissStill}
            style={styles.primaryButton}
          >
            <Text style={styles.buttonText}>{t('action.closeStill')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('action.capture')}
            accessibilityState={{ disabled: !view.captureEnabled }}
            disabled={!view.captureEnabled}
            onPress={() => void actions.takePhoto()}
            style={[styles.primaryButton, !view.captureEnabled && styles.disabled]}
          >
            <Text style={styles.buttonText}>{t('action.capture')}</Text>
          </Pressable>
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
  root: { flex: 1, backgroundColor: '#0B0F14' },
  guideHost: { position: 'absolute', left: 0, right: 0, top: 0 },
  privacy: { ...StyleSheet.absoluteFill, backgroundColor: '#0B0F14', justifyContent: 'center', padding: 16 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: BAR_BACKGROUND, paddingBottom: 10, gap: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BAR_BACKGROUND, paddingTop: 10, gap: 10 },
  message: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
  actionButton: { alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8, backgroundColor: '#37474F' },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#1565C0' },
  disabled: { backgroundColor: '#37474F' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 24 },
});
