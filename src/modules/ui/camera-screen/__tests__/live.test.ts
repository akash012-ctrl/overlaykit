import type { OverlayItem } from '../../overlay/build-items';
import type { FreezeOverlayState, LabelState, OverlaySource } from '../../overlay/freeze-overlay';
import { EMPTY_FREEZE_OVERLAY } from '../../overlay/freeze-overlay';
import { itemsForMode, nextLiveDisplay } from '../useCameraScreen';

const item = (id: string, state: LabelState) => ({ id, state }) as unknown as OverlayItem;
const source = (id: string, label: LabelState) => ({ id, label }) as unknown as OverlaySource;
const overlay = (...sources: OverlaySource[]): FreezeOverlayState => ({ shown: null, lowQuality: false, sources });

const translated: LabelState = { kind: 'translated', text: 'Cancel', providerId: 'p' };
const unchanged: LabelState = { kind: 'translated', text: 'Cancel', providerId: 'p', unchanged: true };
const unsupported: LabelState = { kind: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT' };
const pending: LabelState = { kind: 'pending' };

describe('itemsForMode', () => {
  const items = [item('a', translated), item('b', unchanged), item('c', unsupported), item('d', pending)];

  it('Translate hides lines already in the target language, and unreadable scripts only while live', () => {
    expect(itemsForMode(items, 'translate', true).map((i) => i.id)).toEqual(['a', 'd']);
    expect(itemsForMode(items, 'translate', false).map((i) => i.id)).toEqual(['a', 'c', 'd']);
  });

  it('Explore keeps every line', () => {
    expect(itemsForMode(items, 'explore', true)).toBe(items);
  });
});

describe('nextLiveDisplay', () => {
  const shownBefore = overlay(source('old', translated));

  it('keeps the labels on screen while the new frame still has pending translations', () => {
    expect(nextLiveDisplay(shownBefore, overlay(source('new', pending)))).toBe(shownBefore);
  });

  it('swaps once every label of the new frame has settled', () => {
    const next = overlay(source('new', translated));
    expect(nextLiveDisplay(shownBefore, next)).toBe(next);
  });

  it('shows pending labels when nothing is on screen yet', () => {
    const next = overlay(source('new', pending));
    expect(nextLiveDisplay(EMPTY_FREEZE_OVERLAY, next)).toBe(next);
  });
});
