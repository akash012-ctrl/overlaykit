import { StyleSheet, View } from 'react-native';

import { CannotPlanView } from './CannotPlanView';
import { FinishPrompt } from './FinishPrompt';
import { GoalBoxes, GoalPicker, voiceGoalSource } from './GoalPicker';
import { HighlightLayer } from './HighlightLayer';
import { ModelGate } from './ModelGate';
import { PlanningView } from './PlanningView';
import { SpeakControl } from './SpeakControl';
import { CompletionView, PausedView } from './StatusViews';
import { StepCard } from './StepCard';
import type { GuideDeps } from './usePlanGuide';
import { usePlanGuide } from './usePlanGuide';

/**
 * Guide mode of the Camera_Screen: pick a goal by tap or voice, the on-device planner proposes one step
 * at a time, a 2D mark shows where. Not a route. The parent mounts it only while the mode is Guide, so
 * switching mode unmounts it and drops all Guide state. Marks are drawn on the image; they do not track.
 */
export function GuideScreen({
  deps,
  onSwitchMode,
}: {
  deps: GuideDeps;
  onSwitchMode: (mode: 'translate' | 'explore') => void;
}) {
  const g = usePlanGuide(deps);
  const { view, actions } = g;
  const toTranslate = () => onSwitchMode('translate');
  const toExplore = () => onSwitchMode('explore');
  const stepSpeakable = g.stepText.kind === 'translated' || g.locale === 'en';

  return (
    <>
      {view.kind === 'goal' ? (
        <GoalBoxes boxes={g.goalLines.boxes} region={g.region} onPick={(text, source) => actions.setGoal(text, source)} />
      ) : null}
      {view.kind === 'step' && g.highlight?.kind === 'drawn' ? (
        <HighlightLayer highlight={g.highlight.highlight} region={g.region} />
      ) : null}
      <View style={styles.dock}>
        {view.kind === 'model-gate' ? (
          <ModelGate planner={view.planner} onTranslate={toTranslate} onExplore={toExplore} />
        ) : null}
        {view.kind === 'goal' ? (
          <GoalPicker
            lines={g.goalLines.list}
            reading={g.reading}
            onRead={actions.readNow}
            onPick={(text, source) => actions.setGoal(text, source)}
            onVoiceGoal={(goal) => actions.setGoal(goal, voiceGoalSource())}
          />
        ) : null}
        {view.kind === 'planning' ? <PlanningView goal={view.goal} goalText={g.goalText} onStop={actions.stop} /> : null}
        {view.kind === 'step' ? (
          <StepCard
            step={view}
            text={g.stepText}
            notInView={g.highlight?.kind !== 'drawn'}
            checking={g.reading}
            onDone={actions.done}
            onBack={actions.back}
            onRetry={actions.retry}
            onCheck={actions.readNow}
            onStop={actions.stop}
            speakControl={
              stepSpeakable ? (
                <SpeakControl
                  key={view.stepId}
                  text={g.stepText.kind === 'translated' ? g.stepText.text : view.instruction}
                />
              ) : undefined
            }
          />
        ) : null}
        {view.kind === 'proposed-finish' ? (
          <FinishPrompt onFinish={actions.finish} onNotYet={actions.notYet} onStop={actions.stop} />
        ) : null}
        {view.kind === 'paused' ? <PausedView onCheck={actions.readNow} onStop={actions.stop} checking={g.reading} /> : null}
        {view.kind === 'cannot-plan' ? (
          <CannotPlanView
            code={view.code}
            reason={g.reason}
            onRetry={actions.retry}
            onTranslate={toTranslate}
            onExplore={toExplore}
            onStop={actions.stop}
          />
        ) : null}
        {view.kind === 'completed' ? <CompletionView onAgain={actions.reset} /> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '60%' },
});
