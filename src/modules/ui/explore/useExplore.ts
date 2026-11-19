import { useCallback, useMemo, useState } from 'react';

import type { MachineService } from '../../components';
import type { HitItem } from '../../geometry';
import { hitTest } from '../../geometry';
import type { FrameRef, LocaleCode, MachineMatch, OcrResult, Point } from '../../shared';
import type { OverlayItem } from '../overlay/build-items';
import type { LabelContent } from '../translate/label-model';
import type { ViewComponent } from './component-items';
import { toViewComponents } from './component-items';
import type { ExploreView } from './explore-model';
import { toExploreView } from './explore-model';

type Shown = { readonly frameId: string; readonly view: ExploreView };
type Requested = { readonly frameId: string; readonly componentId: string };

/**
 * Explore for the shown still (design.md, "Identification timing"). The match is computed once per
 * applied OcrResult, in Explore mode only. Anything stored for another frame is discarded (R22.7).
 * This hook holds no verification rule: `identifyMachine` decides, `toExploreView` only reads it.
 */
export function useExplore(args: {
  readonly active: boolean;
  readonly machines: MachineService;
  readonly result: OcrResult | null;
  readonly shown: FrameRef | null;
  readonly viewSize: { readonly width: number; readonly height: number };
  readonly items: readonly OverlayItem[];
  readonly labels: Readonly<Record<string, LabelContent>>;
  readonly uiLocale: LocaleCode;
}) {
  const { active, machines, result, shown, viewSize, items, labels, uiLocale } = args;
  const [tapped, setTapped] = useState<Shown | null>(null);
  const [requested, setRequested] = useState<Requested | null>(null);

  const match: MachineMatch | null = useMemo(
    () => (active && result ? machines.identifyMachine(result) : null),
    [active, result, machines],
  );
  const located = useMemo(() => (match && result ? machines.locateComponents(match, result) : null), [match, result, machines]);
  const components: readonly ViewComponent[] = useMemo(
    () => (located ? toViewComponents(located.located, shown, viewSize) : []),
    [located, shown, viewSize],
  );

  // Names for the component list. A component with no authored name is not listed (nothing is invented).
  const list = useMemo(() => {
    if (match?.status !== 'verified') return [];
    return machines.listComponents().flatMap(({ id }) => {
      const name = machines.componentName(id, uiLocale);
      return name.ok ? [{ id, name: name.value }] : [];
    });
  }, [match, machines, uiLocale]);

  const onTap = useCallback(
    (point: Point) => {
      if (!result) return;
      const hitItems: HitItem[] = [
        ...components.map((c): HitItem => ({ kind: 'component', id: c.id, quad: c.quad })),
        ...items.filter((i) => i.visibility === 'visible').map((i): HitItem => ({ kind: 'label', id: i.id, quad: i.quad })),
      ];
      const view = toExploreView({
        match,
        tapped: hitTest(point, hitItems),
        labels,
        explain: (id) => machines.explain(id, uiLocale),
        name: (id) => machines.componentName(id, uiLocale),
      });
      setTapped({ frameId: result.frameId, view });
    },
    [result, components, items, match, labels, machines, uiLocale],
  );

  const request = useCallback((componentId: string) => result && setRequested({ frameId: result.frameId, componentId }), [result]);
  const close = useCallback(() => {
    setTapped(null);
    setRequested(null);
  }, []);

  const frameId = result?.frameId;
  const view: ExploreView = active && tapped && tapped.frameId === frameId ? tapped.view : { kind: 'nothing' };
  const wanted = active && requested && requested.frameId === frameId ? requested.componentId : null;
  const prompt = wanted && located?.notVisible.some((n) => n.componentId === wanted) ? (list.find((c) => c.id === wanted) ?? null) : null;
  // Highlight only a component that is located (R20.7).
  const highlightId = wanted && components.some((c) => c.id === wanted) ? wanted : null;

  return { match, components, list, view, prompt, highlightId, onTap, request, close };
}
