# TM-01 fixture plan (images on an iPad)

Status: **draft, 2026-11-18.** Decisions: D-029 (printed panel plus screen images, iPad as passive display), D-031 (no reviewers for now), D-032 (AI art, our own text).

## 1. What TM-01 is

TM-01 is a **first-party simulated ticket machine**. It is a set of images shown on an iPad. It is not a real machine, and the demo, README and Devpost text must say so.

- The iPad runs no app or web page. A person changes the image by hand. It shares nothing with OverlayKit (no Bluetooth, network, links, shared storage or timers).
- AI image models supply artwork only. Every word on the panel and screens is added by us in an editor, from the strings below.
- No people, faces, real brands, logos or real machine markings.
- Art source: generator `TBD`, date `TBD`. Record both here once the art exists.

## 2. Image production rules

1. One **base panel image** is reused for all screens. Only the screen area changes between steps, so anchors and components keep fixed positions.
2. Generate the panel body without text (card reader, coin slot, note slot, screen area, four buttons, ticket tray). Add all text afterwards.
3. Size: the iPad's native resolution (`TBD`), portrait, no pinch or zoom while testing.
4. iPad settings: full brightness, auto-lock off, Do Not Disturb on, anti-glare angle checked.
5. Keep the final files here as `base-panel.png` and `screens/S01.png` onward. Names below are the ids.
6. Measure each box (section 3) from the final image and replace every DRAFT value. Until then no test may rely on a box.

## 3. Ground-truth strings on the base panel

All boxes are normalized (0 to 1, origin top left) and are **DRAFT values, to be measured from the final image**.

| Id | Exact text | Component | Anchor | Box x,y,w,h (DRAFT) |
| --- | --- | --- | --- | --- |
| L01 | TICKET MACHINE | panel header | yes | 0.25, 0.03, 0.50, 0.05 |
| L02 | Select Destination | touchscreen caption | yes | 0.20, 0.10, 0.60, 0.05 |
| L03 | Insert Card | card-reader | yes | 0.05, 0.62, 0.28, 0.04 |
| L04 | Coins | coin-slot | yes | 0.38, 0.62, 0.24, 0.04 |
| L05 | Notes | note-slot | no | 0.67, 0.62, 0.24, 0.04 |
| L06 | Cancel | button | yes | 0.05, 0.80, 0.22, 0.04 |
| L07 | Confirm | button | no | 0.29, 0.80, 0.22, 0.04 |
| L08 | Help | button | no | 0.53, 0.80, 0.22, 0.04 |
| L09 | Ticket | ticket-tray | yes | 0.30, 0.92, 0.40, 0.04 |

Proposed anchors: L01, L02, L03, L04, L06, L09 (six). `minAnchors` and `minScore` stay named constants set in G3, not here.

## 4. Components

| Id | Kind | Label | Region (DRAFT, normalized) |
| --- | --- | --- | --- |
| C-SCREEN | touchscreen | L02 area | 0.10, 0.08, 0.80, 0.42 |
| C-CARD | card-reader | L03 | 0.05, 0.55, 0.28, 0.07 |
| C-COIN | coin-slot | L04 | 0.38, 0.55, 0.24, 0.07 |
| C-NOTE | note-slot | L05 | 0.67, 0.55, 0.24, 0.07 |
| C-CANCEL | button | L06 | 0.05, 0.74, 0.22, 0.06 |
| C-CONFIRM | button | L07 | 0.29, 0.74, 0.22, 0.06 |
| C-HELP | button | L08 | 0.53, 0.74, 0.22, 0.06 |
| C-TRAY | ticket-tray | L09 | 0.30, 0.85, 0.40, 0.07 |

## 5. Workflow: Buy a single-journey ticket

| Step | Target component | Screen shown | Checkpoint | English instruction (draft) |
| --- | --- | --- | --- | --- |
| W1 | C-SCREEN | S01 | text-visible: `Select Destination` | Choose your destination on the screen. |
| W2 | C-SCREEN | S02 | text-visible: `Single Journey` | Choose Single Journey. |
| W3 | C-CONFIRM | S03 | text-visible: `Total: 20` | Check the price, then press Confirm. |
| W4 | C-CARD | S04 | text-visible: `Insert Card` | Insert your card into the card reader. |
| W5 | C-SCREEN | S05 | manual | Wait while the machine prints. Press Done when the screen says Printing. |
| W6 | C-TRAY | S06 | text-visible: `Collect your ticket` | Take your ticket from the tray. |

A person swaps the iPad image after each real action. The app must advance only when the camera sees the checkpoint twice in a row (D-019), or on Done for W5.

## 6. Screen images (exact on-screen text)

| Id | Text on the screen area |
| --- | --- |
| S01 | `Select Destination` / `Central Station` / `Airport` / `Harbour` |
| S02 | `Single Journey` / `Return Journey` / `Day Pass` |
| S03 | `Single Journey to Central Station` / `Total: 20` / `Press Confirm` |
| S04 | `Insert Card` / `Total: 20` |
| S05 | `Printing` / `Please wait` |
| S06 | `Collect your ticket` / `Thank you` |

The currency symbol is left out on purpose so no glyph is garbled. Add one only if it is part of the ground-truth list.

## 7. Hindi and Kannada content

No reviewers (D-031). Authored text is marked `unreviewed` and never called reviewed.

| Item | hi | kn | Status |
| --- | --- | --- | --- |
| Component explanations (C-CARD, C-COIN, C-NOTE, C-CANCEL, C-CONFIRM, C-HELP, C-TRAY, C-SCREEN) | TODO author | TODO author | unreviewed |
| Step instructions W1 to W6 | TODO author | TODO author | unreviewed |
| Workflow title | TODO author | TODO author | unreviewed |

## 8. Negative set (all images; for AT-G3-02 and AT-G4-01)

| Id | Description |
| --- | --- |
| NEG-01 | A different generated ticket panel with different labels |
| NEG-02 | Same layout as TM-01 but every label reworded |
| NEG-03 | TM-01 art with only three of the six anchors visible |
| NEG-04 | TM-01 art with the header and bottom half cropped out |
| NEG-05 | A bus-stop timetable image |
| NEG-06 | A parking machine panel with similar buttons |
| NEG-07 | A vending machine panel |
| NEG-08 | TM-01 with the anchor texts swapped between positions |
| NEG-09 | A poster with the words Insert Card and Coins only |
| NEG-10 | An ATM-style panel |

Rules: self-generated art only, no people, no brands. NEG-08 and NEG-09 check that matching text alone never identifies TM-01.

## 9. iPad capture checklist

- [ ] Brightness full, auto-lock off, glare and screen pattern checked at D30, D60, D100 and at A0 and A30.
- [ ] 10 captures of the base panel (AT-G1-02), counted against section 3.
- [ ] CARD-EN, CARD-HI and CARD-KN shown as images. BLANK is a plain grey image.
- [ ] Every image checked for misspelt or garbled words before use.
- [ ] Recall under 70% in good light: stop, and try paper before changing code (G1 stop condition).
- [ ] Record results in `docs/DEVICE-TESTS.md`. Without a phone, every item stays "device validation pending".
