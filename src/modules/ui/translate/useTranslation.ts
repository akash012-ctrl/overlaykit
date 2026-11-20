import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import type { TranslationService } from '../../locale';
import { planTranslation, prepareTranslation, subscribeOnDeviceStatus, useLocaleSettings } from '../../locale';
import type { LocaleCode, OcrResult, SourceLocale } from '../../shared';
import type { LabelContent, PlanEntry } from './label-model';
import { EMPTY_TRANSLATION, translationReducer } from './label-model';
import { DIGIT_SEQUENCE_MIN_LENGTH, OFFLINE_RETRY_INTERVAL_MS } from './thresholds';

type SendEntry = Extract<PlanEntry, { kind: 'send' }>;

function buildPlan(result: OcrResult, target: LocaleCode): readonly PlanEntry[] {
  const plan = planTranslation(result.lines, target, DIGIT_SEQUENCE_MIN_LENGTH);
  return plan.map((entry, index) => ({ ...entry, id: `${result.frameId}/${index}` }));
}

/**
 * Translation of the shown still (design.md, "useTranslation"). Gated until the privacy note is
 * acknowledged: no translate call before that (R15.2). One translate call per language pair
 * (R12.1). A result for another frame or target is ignored by the reducer.
 */
export function useTranslation(result: OcrResult | null, service: TranslationService) {
  const settings = useLocaleSettings();
  const [state, dispatch] = useReducer(translationReducer, EMPTY_TRANSLATION);
  const stateRef = useRef(state);
  const planRef = useRef<readonly PlanEntry[]>([]);
  const appliedRef = useRef<{ frameId: string; target: LocaleCode; acknowledged: boolean } | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { loaded, targetLocale, privacyAcknowledged } = settings;

  // Fetch the language models in the background once the user has seen the privacy note (D-053).
  useEffect(() => {
    if (loaded && privacyAcknowledged) prepareTranslation(targetLocale);
  }, [loaded, privacyAcknowledged, targetLocale]);

  /** One call per source language. Late replies are dropped by the reducer (R2.8). */
  const send = useCallback(
    (frameId: string, target: LocaleCode, entries: readonly SendEntry[]) => {
      const bySource = new Map<SourceLocale, SendEntry[]>();
      for (const entry of entries) bySource.set(entry.source, [...(bySource.get(entry.source) ?? []), entry]);
      bySource.forEach((group, source) => {
        void service
          .translate(
            group.map((e) => e.text),
            { source, target },
          )
          .then((outcomes) =>
            dispatch({ type: 'translation-settled', frameId, target, ids: group.map((e) => e.id), outcomes }),
          );
      });
    },
    [service],
  );

  // A new still, a new target or the acknowledgement re-plans the labels.
  useEffect(() => {
    if (!result) {
      appliedRef.current = null;
      planRef.current = [];
      dispatch({ type: 'still-dismissed' });
      return;
    }
    if (!loaded) return;
    const prev = appliedRef.current;
    if (prev && prev.frameId === result.frameId && prev.target === targetLocale && prev.acknowledged === privacyAcknowledged) return;
    const plan = buildPlan(result, targetLocale);
    planRef.current = plan;
    appliedRef.current = { frameId: result.frameId, target: targetLocale, acknowledged: privacyAcknowledged };
    if (!prev || prev.frameId !== result.frameId) {
      dispatch({ type: 'result-applied', frameId: result.frameId, plan, gated: !privacyAcknowledged, target: targetLocale });
    } else if (prev.target !== targetLocale) {
      dispatch({ type: 'target-changed', target: targetLocale, plan });
    } else {
      dispatch({ type: 'privacy-acknowledged', plan });
    }
    if (privacyAcknowledged) send(result.frameId, targetLocale, plan.filter((e): e is SendEntry => e.kind === 'send'));
  }, [result, loaded, targetLocale, privacyAcknowledged, send]);

  const retry = useCallback(
    (ids: readonly string[]) => {
      const current = stateRef.current;
      const applied = appliedRef.current;
      if (!applied || current.frameId === null || !applied.acknowledged) return;
      const entries = planRef.current.filter((e): e is SendEntry => e.kind === 'send' && ids.includes(e.id));
      if (entries.length === 0) return;
      dispatch({ type: 'retry', frameId: current.frameId, ids: entries.map((e) => e.id) });
      send(current.frameId, current.target, entries);
    },
    [send],
  );

  const retryOffline = useCallback(() => {
    const ids = Object.entries(stateRef.current.labels)
      .filter(([, label]) => label.state === 'failed' && label.code === 'TR_OFFLINE')
      .map(([id]) => id);
    if (ids.length > 0) retry(ids);
  }, [retry]);

  // TR_OFFLINE labels retry on a timer and on foreground. The request is the connectivity probe (R9.3, DP-10).
  const hasOffline = Object.values(state.labels).some((l) => l.state === 'failed' && l.code === 'TR_OFFLINE');
  useEffect(() => {
    if (!hasOffline) return undefined;
    const timer = setInterval(retryOffline, OFFLINE_RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') retryOffline();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [hasOffline, retryOffline]);

  // "Downloading language data" while an on-device model for the shown pair downloads (R9.9).
  useEffect(
    () =>
      subscribeOnDeviceStatus((status) => {
        const current = stateRef.current;
        if (current.frameId === null || status.pair.target !== current.target) return;
        const ids = planRef.current.filter((e) => e.kind === 'send' && e.source === status.pair.source).map((e) => e.id);
        dispatch({ type: 'download-state', frameId: current.frameId, ids, downloading: status.state === 'downloading' });
      }),
    [],
  );

  const labels: Readonly<Record<string, LabelContent>> = state.labels;
  return { labels, retry };
}
