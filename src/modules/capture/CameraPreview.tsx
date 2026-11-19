// Renders the camera library's preview. Only this file and camera-adapter.ts touch expo-camera.
import { CameraView } from 'expo-camera';
import { useEffect, useRef, type Ref, useImperativeHandle } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { PreviewHandle } from './camera-adapter';
import { toPreviewHandle } from './camera-adapter';
import type { CameraState } from './types';

export type CameraPreviewProps = {
  readonly ref?: Ref<PreviewHandle | null>;
  /** false releases the camera: app in the background, or a still is shown (R2.7, DD-9). */
  readonly active: boolean;
  readonly onStateChange: (state: CameraState) => void;
  readonly style?: StyleProp<ViewStyle>;
};

/**
 * Back camera only (R2.1). No `ratio` prop, so the Android preview uses FILL,
 * which is centred cover scaling (R10.5; checked on the phone in task 14.1).
 */
export function CameraPreview({ ref, active, onStateChange, style }: CameraPreviewProps) {
  const viewRef = useRef<CameraView | null>(null);
  useImperativeHandle<PreviewHandle | null, PreviewHandle | null>(
    ref,
    () => (viewRef.current ? toPreviewHandle(viewRef.current) : null),
  );

  useEffect(() => {
    if (active) onStateChange({ kind: 'starting' });
  }, [active, onStateChange]);

  if (!active) return null;
  return (
    <CameraView
      ref={viewRef}
      style={[StyleSheet.absoluteFill, style]}
      facing="back"
      mode="picture"
      animateShutter={false}
      onCameraReady={() => onStateChange({ kind: 'ready' })}
      onMountError={() => onStateChange({ kind: 'unavailable', code: 'CAM_UNAVAILABLE' })}
    />
  );
}
