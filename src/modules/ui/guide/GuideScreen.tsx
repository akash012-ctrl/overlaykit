import { StyleSheet, View } from 'react-native';

import { HighlightLayer } from './HighlightLayer';
import { RefusalView } from './RefusalView';
import { SpeakControl } from './SpeakControl';
import { StepCard } from './StepCard';
import { CancelledView, CompletionView, LookingView, PausedView } from './StatusViews';
import { TaskPicker } from './TaskPicker';
import type { GuideDeps } from './useGuide';
import { useGuide } from './useGuide';

/**
 * Guide mode of the Camera_Screen. Not a route. The parent mounts it only while the mode is Guide,
 * so switching mode unmounts it and drops all Guide state (OQ-7). `onSwitchMode` is the existing mode setter.
 */
export function GuideScreen({
  deps,
  onSwitchMode,
}: {
  deps: GuideDeps;
  onSwitchMode: (mode: 'translate' | 'explore') => void;
}) {
  const { view, actions, region } = useGuide(deps);
  return (
    <>
      {view.kind === 'step' ? <HighlightLayer highlight={view.highlight} region={region} /> : null}
      <View style={styles.dock}>
        {view.kind === 'looking' ? <LookingView /> : null}
        {view.kind === 'refusal' ? (
          <RefusalView
            messageKey="guide.refusal"
            onTranslate={() => onSwitchMode('translate')}
            onExplore={() => onSwitchMode('explore')}
          />
        ) : null}
        {view.kind === 'picker' && view.noneAvailable && actions.startDebugInvalid === null ? (
          <RefusalView
            messageKey="guide.unavailable"
            onTranslate={() => onSwitchMode('translate')}
            onExplore={() => onSwitchMode('explore')}
          />
        ) : null}
        {view.kind === 'picker' && (!view.noneAvailable || actions.startDebugInvalid !== null) ? (
          <TaskPicker workflows={view.workflows} onPick={actions.start} onDebugInvalid={actions.startDebugInvalid} />
        ) : null}
        {view.kind === 'step' ? (
          <StepCard
            step={view}
            onDone={actions.done}
            onRetry={actions.retry}
            onBack={actions.back}
            speakControl={<SpeakControl key={`${view.stepId}`} text={view.instruction} />}
          />
        ) : null}
        {view.kind === 'paused' ? <PausedView /> : null}
        {view.kind === 'cancelled' ? <CancelledView onStartAgain={actions.reset} /> : null}
        {view.kind === 'completed' ? (
          <CompletionView workflowTitle={view.workflowTitle} onBackToTasks={actions.reset} />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '60%' },
});