import type { FreezeOverlayState, LabelState } from '../overlay/freeze-overlay';
import type { LabelContent } from './label-model';

/** One label's content as the overlay's LabelState. Unsupported lines keep the state the overlay gave them. */
export function toLabelState(content: LabelContent | undefined, fallback: LabelState): LabelState {
  if (!content || content.state === 'unsupported') return fallback;
  switch (content.state) {
    case 'pending':
      return { kind: 'pending', reason: content.reason };
    case 'translated':
      return content.origin === 'provider'
        ? { kind: 'translated', text: content.text, providerId: content.providerId }
        : { kind: 'translated', text: content.text, providerId: content.origin, unchanged: true };
    case 'failed':
      // The privacy gate shows the same marker as TR_NOT_CONFIGURED: "Translation not available".
      return { kind: 'failed', code: content.code === 'PRIVACY_NOT_ACKNOWLEDGED' ? 'TR_NOT_CONFIGURED' : content.code };
  }
}

/** The overlay with every line's label taken from the translation state. */
export function withLabels(overlay: FreezeOverlayState, labels: Readonly<Record<string, LabelContent>>): FreezeOverlayState {
  return { ...overlay, sources: overlay.sources.map((source) => ({ ...source, label: toLabelState(labels[source.id], source.label) })) };
}
