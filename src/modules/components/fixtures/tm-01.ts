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

type L3 = { readonly en: string; readonly hi: string; readonly kn: string };
const EMPTY: L3 = { en: '', hi: '', kn: '' };

/**
 * Owner-approved DRAFT text from .scratch/drafts/tm-01-text-draft.md section 2 and 3. All hi and kn
 * text is unreviewed (D-031): no native speaker has checked it. Empty explanations are rows that
 * still need owner input (C-COIN, C-NOTE, C-CANCEL, C-HELP). They are not shown: the validator rejects them.
 */
const TEXT: Readonly<Record<string, { readonly name: L3; readonly explanation: L3 }>> = {
  'C-SCREEN': {
    name: { en: 'Screen', hi: 'स्क्रीन', kn: 'ಪರದೆ' },
    explanation: {
      en: 'The touchscreen. It shows the choices and the price. Choose your destination and ticket type here.',
      hi: 'यह टचस्क्रीन है। इस पर विकल्प और कीमत दिखती है। यहाँ गंतव्य और टिकट का प्रकार चुनें।',
      kn: 'ಇದು ಟಚ್‌ಸ್ಕ್ರೀನ್. ಇದರಲ್ಲಿ ಆಯ್ಕೆಗಳು ಮತ್ತು ಬೆಲೆ ಕಾಣುತ್ತದೆ. ಇಲ್ಲಿ ಗಮ್ಯಸ್ಥಾನ ಮತ್ತು ಟಿಕೆಟ್ ಪ್ರಕಾರ ಆಯ್ಕೆಮಾಡಿ.',
    },
  },
  'C-CARD': {
    name: { en: 'Card reader', hi: 'कार्ड रीडर', kn: 'ಕಾರ್ಡ್ ರೀಡರ್' },
    explanation: {
      en: 'Card reader. Insert your card here to pay when the screen says "Insert Card".',
      hi: 'यह कार्ड रीडर है। स्क्रीन पर "Insert Card" दिखे, तब भुगतान के लिए यहाँ कार्ड डालें।',
      kn: 'ಇದು ಕಾರ್ಡ್ ರೀಡರ್. ಪರದೆಯಲ್ಲಿ "Insert Card" ಕಾಣಿಸಿದಾಗ ಪಾವತಿಗೆ ಇಲ್ಲಿ ಕಾರ್ಡ್ ಹಾಕಿ.',
    },
  },
  'C-COIN': { name: { en: 'Coin slot', hi: 'सिक्का स्लॉट', kn: 'ನಾಣ್ಯ ಸ್ಲಾಟ್' }, explanation: EMPTY },
  'C-NOTE': { name: { en: 'Note slot', hi: 'नोट स्लॉट', kn: 'ನೋಟು ಸ್ಲಾಟ್' }, explanation: EMPTY },
  'C-CANCEL': { name: { en: 'Cancel button', hi: 'रद्द करें बटन', kn: 'ರದ್ದುಮಾಡಿ ಬಟನ್' }, explanation: EMPTY },
  'C-CONFIRM': {
    name: { en: 'Confirm button', hi: 'पुष्टि करें बटन', kn: 'ದೃಢೀಕರಿಸಿ ಬಟನ್' },
    explanation: {
      en: 'Press Confirm after you check the price on the screen.',
      hi: 'स्क्रीन पर कीमत देखने के बाद "Confirm" दबाएँ।',
      kn: 'ಪರದೆಯಲ್ಲಿ ಬೆಲೆ ನೋಡಿದ ನಂತರ "Confirm" ಒತ್ತಿ.',
    },
  },
  'C-HELP': { name: { en: 'Help button', hi: 'मदद बटन', kn: 'ಸಹಾಯ ಬಟನ್' }, explanation: EMPTY },
  'C-TRAY': {
    name: { en: 'Ticket tray', hi: 'टिकट ट्रे', kn: 'ಟಿಕೆಟ್ ಟ್ರೇ' },
    explanation: {
      en: 'The ticket tray. Your ticket comes out here after printing. Take it from here.',
      hi: 'यह टिकट ट्रे है। छपने के बाद टिकट यहाँ आता है। इसे यहाँ से ले लें।',
      kn: 'ಇದು ಟಿಕೆಟ್ ಟ್ರೇ. ಮುದ್ರಣದ ನಂತರ ಟಿಕೆಟ್ ಇಲ್ಲಿ ಬರುತ್ತದೆ. ಇಲ್ಲಿಂದ ತೆಗೆದುಕೊಳ್ಳಿ.',
    },
  },
};

/**
 * Task 12.2 data. Invalid on purpose (so every machine is `none`) until:
 * - the four explanations in TEXT that are empty get owner text,
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
    name: TEXT[c.id]?.name ?? EMPTY,
    explanation: TEXT[c.id]?.explanation ?? EMPTY,
  })),
  review: { hi: 'unreviewed', kn: 'unreviewed' },
  simulated: true,
  screens: SCREENS,
  /**
   * Spec 03 task 4.1. Text from .scratch/drafts/tm-01-text-draft.md sections 1, 4 and 5 (owner approved,
   * en from FIXTURE.md section 5). hi and kn are unreviewed (D-031).
   * `performed` is EMPTY on purpose: nobody has recorded performing this workflow (needs owner input).
   * The method field is a type placeholder, not a claim. loadWorkflow rejects the blank `by` and `on`
   * with GD_FIXTURE_INVALID, so Guide stays unavailable until the owner supplies the record.
   */
  workflows: [
    {
      id: 'buy-single-journey',
      title: {
        en: 'Buy a single-journey ticket',
        hi: 'एकल यात्रा का टिकट खरीदें',
        kn: 'ಒಂದು ಪ್ರಯಾಣದ ಟಿಕೆಟ್ ಖರೀದಿಸಿ',
      },
      steps: [
        {
          id: 'W1',
          targetComponentId: 'C-SCREEN',
          instruction: {
            en: 'Choose your destination on the screen.',
            hi: 'स्क्रीन पर अपना गंतव्य चुनें।',
            kn: 'ಪರದೆಯಲ್ಲಿ ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ಆಯ್ಕೆಮಾಡಿ.',
          },
          expectedResult: {
            en: 'The screen shows "Select Destination".',
            hi: 'स्क्रीन पर "Select Destination" दिखता है।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Select Destination" ಕಾಣಿಸುತ್ತದೆ.',
          },
          checkpoint: { kind: 'text-visible', text: 'Select Destination', screenId: 'S01' },
        },
        {
          id: 'W2',
          targetComponentId: 'C-SCREEN',
          instruction: {
            en: 'Choose Single Journey.',
            hi: '"Single Journey" चुनें।',
            kn: '"Single Journey" ಆಯ್ಕೆಮಾಡಿ.',
          },
          expectedResult: {
            en: 'The screen shows "Single Journey".',
            hi: 'स्क्रीन पर "Single Journey" दिखता है।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Single Journey" ಕಾಣಿಸುತ್ತದೆ.',
          },
          checkpoint: { kind: 'text-visible', text: 'Single Journey', screenId: 'S02' },
        },
        {
          id: 'W3',
          targetComponentId: 'C-CONFIRM',
          instruction: {
            en: 'Check the price, then press Confirm.',
            hi: 'कीमत देखें, फिर "Confirm" दबाएँ।',
            kn: 'ಬೆಲೆ ನೋಡಿ, ನಂತರ "Confirm" ಒತ್ತಿ.',
          },
          expectedResult: {
            en: 'The screen shows "Total: 20".',
            hi: 'स्क्रीन पर "Total: 20" दिखता है।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Total: 20" ಕಾಣಿಸುತ್ತದೆ.',
          },
          checkpoint: { kind: 'text-visible', text: 'Total: 20', screenId: 'S03' },
        },
        {
          id: 'W4',
          targetComponentId: 'C-CARD',
          instruction: {
            en: 'Insert your card into the card reader.',
            hi: 'अपना कार्ड कार्ड रीडर में डालें।',
            kn: 'ನಿಮ್ಮ ಕಾರ್ಡ್ ಅನ್ನು ಕಾರ್ಡ್ ರೀಡರ್‌ನಲ್ಲಿ ಹಾಕಿ.',
          },
          expectedResult: {
            en: 'The screen shows "Insert Card".',
            hi: 'स्क्रीन पर "Insert Card" दिखता है।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Insert Card" ಕಾಣಿಸುತ್ತದೆ.',
          },
          checkpoint: { kind: 'text-visible', text: 'Insert Card', screenId: 'S04' },
        },
        {
          id: 'W5',
          targetComponentId: 'C-SCREEN',
          instruction: {
            en: 'Wait while the machine prints. Press Done when the screen says Printing.',
            hi: 'मशीन के छापने तक रुकें। स्क्रीन पर "Printing" दिखे तो Done दबाएँ।',
            kn: 'ಯಂತ್ರ ಮುದ್ರಿಸುವವರೆಗೆ ಕಾಯಿರಿ. ಪರದೆಯಲ್ಲಿ "Printing" ಕಾಣಿಸಿದರೆ Done ಒತ್ತಿ.',
          },
          expectedResult: {
            en: 'The screen says "Printing". You confirm with Done.',
            hi: 'स्क्रीन पर "Printing" दिखता है। आप Done दबाकर बताते हैं।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Printing" ಕಾಣಿಸುತ್ತದೆ. ನೀವು Done ಒತ್ತಿ ಖಚಿತಪಡಿಸಿ.',
          },
          checkpoint: { kind: 'manual' },
        },
        {
          id: 'W6',
          targetComponentId: 'C-TRAY',
          instruction: {
            en: 'Take your ticket from the tray.',
            hi: 'ट्रे से अपना टिकट ले लें।',
            kn: 'ಟ್ರೇಯಿಂದ ನಿಮ್ಮ ಟಿಕೆಟ್ ತೆಗೆದುಕೊಳ್ಳಿ.',
          },
          expectedResult: {
            en: 'The screen shows "Collect your ticket".',
            hi: 'स्क्रीन पर "Collect your ticket" दिखता है।',
            kn: 'ಪರದೆಯಲ್ಲಿ "Collect your ticket" ಕಾಣಿಸುತ್ತದೆ.',
          },
          checkpoint: { kind: 'text-visible', text: 'Collect your ticket', screenId: 'S06' },
        },
      ],
      performed: { by: '', on: '', method: 'replica' },
      review: { hi: { status: 'unreviewed' }, kn: { status: 'unreviewed' } },
      authored: true,
    },
  ],
};
