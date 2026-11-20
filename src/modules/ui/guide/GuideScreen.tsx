import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { CannotPlanView } from './CannotPlanView';
import { PLAN_ERROR_UI } from './error-map';
import { FinishPrompt } from './FinishPrompt';
import { GoalBoxes, GoalPicker, voiceGoalSource } from './GoalPicker';
import { HighlightLayer } from './HighlightLayer';
import { LiveBanner } from './LiveBanner';
import { LiveStartButton } from './LiveStartButton';
import { ModelGate } from './ModelGate';
import { Icon } from '../icons/Icon';
import { FadeInView } from '../motion/motion';
import { Button, Message, Panel } from '../parts';
import { colors, fontSize, lineHeight, radius, spacing } from '../theme';
import { PlanningView } from './PlanningView';
import { SpeakControl } from './SpeakControl';
import { CompletionView, PausedView } from './StatusViews';
import { StepCard } from './StepCard';
import type { GuideDeps } from './usePlanGuide';
import { usePlanGuide } from './usePlanGuide';

/**
 * Guide mode of the Camera_Screen: pick a goal by tap or voice, the planner proposes one step at a time, a 2D
 * mark shows where. Works on any machine, so every step is an AI suggestion. Not a route. The parent mounts it only
 * while the mode is Guide, so switching mode unmounts it and drops all Guide state (and any Live session).
 * Marks are drawn on the image; they do not track.
 */
export function GuideScreen({
  deps,
  onSwitchMode,
}: {
  deps: GuideDeps;
  onSwitchMode: (mode: 'translate' | 'explore') => void;
}) {
  const g = usePlanGuide(deps);
  const { view, actions, liveInfo } = g;
  const toTranslate = () => onSwitchMode('translate');
  const toExplore = () => onSwitchMode('explore');
  const stepSpeakable = g.stepText.kind === 'translated' || g.locale === 'en';
  /** With Gemini Live chosen, goals are taken only while the session is open, so nothing is planned without Start. */
  const goalReady = !liveInfo.active || liveInfo.banner === 'open';
  /** True after a Live session was on and is now off, so Stop shows a clear 'nothing is being sent' state. */
  const [liveStopped, setLiveStopped] = useState(false);
  // Set during render, guarded so it settles in one extra pass.
  if (liveInfo.banner !== 'off' && !liveStopped) setLiveStopped(true);
  else if (liveInfo.banner === 'off' && view.kind !== 'goal' && liveStopped) setLiveStopped(false);
  const showsPlannerLine = view.kind === 'goal' || view.kind === 'planning' || view.kind === 'step';

  return (
    <>
      {view.kind === 'goal' && goalReady ? (
        <GoalBoxes boxes={g.goalLines.boxes} region={g.region} onPick={(text, source) => actions.setGoal(text, source)} />
      ) : null}
      {view.kind === 'step' && g.highlight?.kind === 'drawn' ? (
        <HighlightLayer highlight={g.highlight.highlight} region={g.region} />
      ) : null}
      <View style={styles.dock}>
        <LiveBanner session={liveInfo.banner} onStop={actions.stop} />
        {liveInfo.banner === 'open' ? (
          <Panel>
            <Button
              icon="mic"
              label={liveInfo.micOn ? t('live.mic.off') : t('live.mic.toggle')}
              onPress={() => liveInfo.setMic(!liveInfo.micOn)}
            />
            {liveInfo.micError !== null ? <Message>{t(PLAN_ERROR_UI[liveInfo.micError].messageKey)}</Message> : null}
          </Panel>
        ) : null}
        {showsPlannerLine ? (
          <View style={styles.plannerPill}>
            <Icon name="ai" size={16} color={colors.accentText} />
            <Text style={styles.plannerText}>{t('guide.planner.line', { name: t(g.plannerNameKey) })}</Text>
          </View>
        ) : null}
        <FadeInView key={view.kind} style={styles.state}>
        {view.kind === 'model-gate' ? (
          <ModelGate planner={view.planner} models={g.models} onTranslate={toTranslate} onExplore={toExplore} />
        ) : null}
        {view.kind === 'goal' && liveInfo.active && liveInfo.banner === 'off' ? (
          <>
            {liveInfo.endedCode !== null ? (
              <Panel>
                <Message>{t(PLAN_ERROR_UI[liveInfo.endedCode].messageKey, { reason: '' })}</Message>
              </Panel>
            ) : liveStopped ? (
              <Panel>
                <Message>{t('live.stopped')}</Message>
              </Panel>
            ) : null}
            <LiveStartButton gate={liveInfo.gate} onStart={liveInfo.start} />
          </>
        ) : null}
        {view.kind === 'goal' && goalReady ? (
          <GoalPicker
            lines={g.goalLines.list}
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
                  autoPlay
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
        </FadeInView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.sm, maxHeight: '62%', gap: spacing.sm },
  state: { flexShrink: 1, gap: spacing.sm },
  plannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.scrim,
  },
  plannerText: { color: colors.textMuted, fontSize: fontSize.note, lineHeight: lineHeight.note },
});
