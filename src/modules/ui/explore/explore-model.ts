import type { Explanation } from '../../components';
import type { HitResult } from '../../geometry';
import type { MachineMatch, Result } from '../../shared';
import type { LabelContent } from '../translate/label-model';

export type ExploreView =
  /** Authored text for a TM-01 component. */
  | { readonly kind: 'explanation'; readonly componentId: string; readonly name: string; readonly text: string }
  /** EXPLANATION_MISSING: the failed state and nothing else (R22.3). */
  | { readonly kind: 'explanation-failed'; readonly componentId: string }
  | {
      readonly kind: 'label-translation';
      readonly labelId: string;
      readonly content: LabelContent | null;
      readonly note: 'not-a-verified-machine' | null;
      readonly hint: 'move-to-show-more' | null;
    }
  | { readonly kind: 'nothing' };

/**
 * Pure. A verified match plus a component under the tap gives the authored explanation. Everything
 * else gives the label view, with "Not a verified machine" unless the match is verified. The view of
 * an unverified match never holds a component name, kind or function (R23.2).
 */
export function toExploreView(args: {
  readonly match: MachineMatch | null;
  readonly tapped: HitResult;
  readonly labels: Readonly<Record<string, LabelContent>>;
  readonly explain: (id: string) => Result<Explanation, 'EXPLANATION_MISSING'>;
  readonly name: (id: string) => Result<string, 'EXPLANATION_MISSING'>;
}): ExploreView {
  const { match, tapped, labels } = args;
  if (tapped.kind !== 'hit') return { kind: 'nothing' };
  const verified = match?.status === 'verified';
  const item = tapped.item;

  if (item.kind === 'component') {
    // Components only exist for a verified match; the check is repeated here.
    if (!verified) return { kind: 'nothing' };
    const explanation = args.explain(item.id);
    const name = args.name(item.id);
    return explanation.ok && name.ok
      ? { kind: 'explanation', componentId: item.id, name: name.value, text: explanation.value.text }
      : { kind: 'explanation-failed', componentId: item.id };
  }

  return {
    kind: 'label-translation',
    labelId: item.id,
    content: labels[item.id] ?? null,
    note: verified ? null : 'not-a-verified-machine',
    hint: match?.status === 'ambiguous' ? 'move-to-show-more' : null,
  };
}
