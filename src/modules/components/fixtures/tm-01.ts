import type { ComponentKind, Quad } from '../../shared';
import type { MachineFixture } from '../fixture-types';

/**
 * Every box and region below is a DRAFT value from test-fixtures/tm-01/FIXTURE.md
 * sections 3 and 4 (normalized 0..1, origin top left). Task 12.1 replaces them with
 * values measured from the final image. No recognition result may rely on them (R17.14).
 */
export const TM01_BOXES_ARE_DRAFT = true;

type Box = readonly [x: number, y: number, w: number, h: number];

const centre = ([x, y, w, h]: Box) => ({ x: x + w / 2, y: y + h / 2 });
const region = ([x, y, w, h]: Box): Quad => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

// Section 3. Anchors: L01, L02, L03, L04, L06, L09.
const ANCHORS: readonly { text: string; box: Box }[] = [
  { text: 'TICKET MACHINE', box: [0.25, 0.03, 0.5, 0.05] },
  { text: 'Select Destination', box: [0.2, 0.1, 0.6, 0.05] },
  { text: 'Insert Card', box: [0.05, 0.62, 0.28, 0.04] },
  { text: 'Coins', box: [0.38, 0.62, 0.24, 0.04] },
  { text: 'Cancel', box: [0.05, 0.8, 0.22, 0.04] },
  { text: 'Ticket', box: [0.3, 0.92, 0.4, 0.04] },
];

// Section 4.
const COMPONENTS: readonly { id: string; kind: ComponentKind; box: Box }[] = [
  { id: 'C-SCREEN', kind: 'touchscreen', box: [0.1, 0.08, 0.8, 0.42] },
  { id: 'C-CARD', kind: 'card-reader', box: [0.05, 0.55, 0.28, 0.07] },
  { id: 'C-COIN', kind: 'coin-slot', box: [0.38, 0.55, 0.24, 0.07] },
  { id: 'C-NOTE', kind: 'note-slot', box: [0.67, 0.55, 0.24, 0.07] },
  { id: 'C-CANCEL', kind: 'button', box: [0.05, 0.74, 0.22, 0.06] },
  { id: 'C-CONFIRM', kind: 'button', box: [0.29, 0.74, 0.22, 0.06] },
  { id: 'C-HELP', kind: 'button', box: [0.53, 0.74, 0.22, 0.06] },
  { id: 'C-TRAY', kind: 'ticket-tray', box: [0.3, 0.85, 0.4, 0.07] },
];

/**
 * Task 12.2 data. Invalid on purpose (so every machine is `none`) until:
 * - component names and explanations exist (FIXTURE.md section 7 lists them as TODO),
 * - minAnchors and minScore are set from the G3 snapshots (task 25.2),
 * - verification is recorded (task 12.1).
 * Empty strings are placeholders, never shown: the validator rejects them.
 */
/** Screen images S01 to S06: exact on-screen text from FIXTURE.md section 6. */
const SCREENS = [
  { id: 'S01', identifyingTexts: ['Select Destination', 'Central Station', 'Airport', 'Harbour'] },
  { id: 'S02', identifyingTexts: ['Single Journey', 'Return Journey', 'Day Pass'] },
  { id: 'S03', identifyingTexts: ['Single Journey to Central Station', 'Total: 20', 'Press Confirm'] },
  { id: 'S04', identifyingTexts: ['Insert Card', 'Total: 20'] },
  { id: 'S05', identifyingTexts: ['Printing', 'Please wait'] },
  { id: 'S06', identifyingTexts: ['Collect your ticket', 'Thank you'] },
] as const;

export const tm01Fixture: MachineFixture = {
  id: 'TM-01',
  version: 0,
  verification: { verifiedBy: '', verifiedOn: '', method: 'replica', evidence: [] },
  identification: {
    anchors: ANCHORS.map((a) => ({ text: a.text, pos: centre(a.box) })),
    minAnchors: 0,
    minScore: 0,
  },
  components: COMPONENTS.map((c) => ({
    id: c.id,
    kind: c.kind,
    region: region(c.box),
    name: { en: '', hi: '', kn: '' },
    explanation: { en: '', hi: '', kn: '' },
  })),
  review: { hi: 'unreviewed', kn: 'unreviewed' },
  simulated: true,
  screens: SCREENS,
  /**
   * PARKED (spec 03 task 4): no workflow is authored. FIXTURE.md has no hi or kn text, no expected
   * results and no performed record, and nothing may be invented. Empty means Guide offers nothing.
   */
  workflows: [],
};
