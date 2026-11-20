---
name: ui-design-system
description: OverlayKit's visual design system and the method for changing any screen. Covers the "camera first, calm chrome" direction, theme tokens, the shared button, icon, card and motion parts, the Camera_Screen layout, live lens chips, the hands-free Guide dock and target ring, Settings, localisation and accessibility as design rules, and the phone screenshot loop that proves a change. Use when designing, restyling or reviewing anything in src/modules/ui or src/app, adding a component, choosing a colour, size, icon or animation, deciding how many marks to draw on the camera image, or judging whether a screen looks finished.
metadata:
  project: overlaykit
  version: "1.1"
---

# OverlayKit UI design system

Values live in code. This file holds the direction, the rules and the reasons. When this file and the code disagree, `src/modules/ui/theme.ts` wins for values; flag the drift.

- Tokens: `src/modules/ui/theme.ts` (colours, radius, spacing, type, sizes, motion).
- Parts: `ui/a11y/A11yButton.tsx` (every touchable), `ui/icons/Icon.tsx` (every glyph), `ui/motion/motion.tsx` (`FadeInView`, `GlideView`, `PulseView`), `ui/parts.tsx` (`Button`, `Panel`, `Card`, `RadioRow`, `IconRow`, `IconTile`, `SectionLabel`, `Title`, `Headline`, `Message`, `Note`, `inputStyle`, `rowStyles`), `ui/status/StatusChip.tsx`.
- Contrast test: `ui/a11y/__tests__/contrast.test.ts` reads the tokens; translucent ones are checked over white.
- Decisions behind this file: D-052 (icons, motion), D-054 (live reading, lens chips), D-055 (hands-free Guide, target ring). Product and UX rules this builds on: `.kiro/steering/native-ux.md`, `docs/PRODUCT.md`.

## Direction: camera first, calm chrome

The user is standing at a machine in a hurry, often in bright light, reading a language they do not know. The picture of the machine is the content; everything else is chrome and stays quiet.

- **Full-bleed camera.** No bars across the top. Controls float on small dark _scrim_ surfaces. The bottom sheet is the only large surface, and it holds what a thumb needs.
- **One accent.** `primary` blue marks the one action to take now (Hold, Done, Download, Say it). Everything else is neutral. State colours (translated green, failed red, unsupported purple) belong to labels on a held still and are never decoration.
- **Fewer marks.** More boxes is never more helpful. When a frame looks busy, remove marks before adding styling (see Overlays).
- **One idea per surface.** A panel says one thing in its largest text, then offers at most one primary button. Notes are smaller and muted. Long help goes behind a button.
- **Shape before colour.** Selection and state show by shape, weight, icon or text as well as colour: a raised segment, a filled radio icon, a check icon, a marker word.
- **Native feel.** Android ripple on press, Material Symbols icons, system font, Material 3 motion curves.

## Tokens

Use a token for every colour, radius, gap and size. A raw hex or a magic number in a view is a review finding (exceptions: label state colours in `ui/overlay/styles.ts`, which are contrast-tested; geometry-driven sizes).

| Group | Roles and rules |
| --- | --- |
| Surfaces | `background` (canvas), `surface` (cards, sheets), `surfaceRaised` (tonal buttons, segment track, inputs), `surfaceHigh` (chips, icon tiles). `scrim` backs anything floating on the camera; `panel` is the near-opaque sheet and Guide card. Text always sits on one of these, never on the video. |
| Lines | `outline`: 1 dp hairline on every floating surface instead of a shadow (shadows do not read on video). `outlineStrong`: input borders, drag handle, selected segment edge, lens chip edge. |
| Accent | `primary` (filled actions, white text ≥ 4.5:1), `primaryContainer` (selected segment and row), `accentText` (icons and links on dark). |
| Overlay | `lens` (translation chip on the live image, white text), `target` (Guide ring and label text, always beside `ringDark`), `ringLight` + `ringDark` (two-tone outlines on a held still). |
| Danger | `dangerContainer` (Live streaming banner, listening orb), `dangerText` (Stop and Delete label and outline). Destructive buttons are outlined, never filled, and sit last in a row. |
| Text | `text`, `textBody`, `textMuted`. Never below 4.5:1 on its surface. |
| Radius | `sm` 8 (labels, chips), `md` 12 (inset boxes, inputs, target ring), `lg` 16 (cards, panels), `xl` 24 (sheet top corners), `pill` (buttons, chips, segments). Buttons are always pills. |
| Spacing | 4 dp grid: `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32. Gutter `lg`; gap inside a panel `md`; between panels `sm`. |
| Type | System font only (Devanagari and Kannada need it). `note` 14/22, `body` 16/24, `title` 18/26, `screenTitle` 24/32, `headline` 24/34. Weights 400 body, 600 labels, 700 titles. Never a fixed height on a text container; no uppercase transforms. |
| Size | `touch` 48, `buttonLg` 56, `shutter` and `orb` 72, `tile` 64, icons 20 / 24 / 28. |
| Motion | Durations: press 100, state 180, enter 240, exit 160, glide 260. Curves (Material 3): standard `0.2,0,0,1`, decelerate `0.05,0.7,0.1,1`, accelerate `0.3,0,0.8,0.15`. |

Adding a token: add it to `theme.ts` with a one-line role comment; if it pairs text with a surface, add the pair to `COLOR_PAIRS` in `ui/a11y/contrast.ts`.

## Parts

### Buttons (`A11yButton`, `Button`, `RadioRow`)

Every touchable goes through `A11yButton` (lint enforces it): role, translated label, 48 dp target, Android ripple, optional icon, `iconOnly` (label spoken, not drawn), `pressScale`, `role="radio"` with `selected`, and `a11yLabel` when TalkBack should hear more than the drawn text.

| Variant (`Button`) | Look | Use |
| --- | --- | --- |
| `primary` | filled `primary` pill, white label, shrinks on press | the one action to take now |
| `secondary` | `surfaceRaised` pill with hairline | other actions, goal-line chips |
| `ghost` | no fill, `accentText` | quiet ways out (Translate / Explore inside Guide, "use the smaller model") |
| `destructive` | `dangerText` outline and label | Stop, Delete key |

Icon-only controls (gear, back, close, speak) are `A11yButton iconOnly` in a 48 dp circle. `RadioRow` is one choice inside a `Card` with no padding: filled radio icon and tinted row when selected, hairline between rows. Rows put the primary first and the destructive last (`rowStyles.farEnd`); rows wrap, labels never truncate.

### Icons (`Icon`)

Material Symbols through `expo-symbols`, imported only in `ui/icons/Icon.tsx` (lint enforces it). The `ICONS` map is the one list of meanings; add a meaning there before using a new glyph. Icons are decorative and hidden from TalkBack. 16–18 dp in rows and badges, 20 in buttons, 24 standalone, 28 in tiles and the orb. In a debug build the font arrives from Metro, so icons can be blank for the first seconds; a release build bundles it.

### Panels, cards, tiles

`Panel` (Guide, over the camera) and `Card` (Settings) are `radius.lg` surfaces with a hairline, padding `lg`, gap `md`. `IconTile` is the 64 dp round tile for state cards and finished states. `IconRow` puts a small icon before text for notes, errors and settings rows. A panel that can grow puts its body in a `ScrollView` with `flexShrink: 1` and pins its button row below, so Done and Stop stay reachable at the largest font in every language.

### Status chip and pill

`StatusChip` is one pill with an optional spinner or icon and one short line (Reading, Listening, Thinking, Waiting); the text carries the state, cross-fades, and is announced once. The camera's top status pill shows a small `accentText` dot while live.

### Empty and error states

When the camera cannot show anything (permission denied or blocked, camera unavailable, text engine unavailable) the screen shows a centred state card: `IconTile`, one sentence as `Title`, one `primary` action. States that keep the camera usable (no text, recognition failed, capture failed) use the top pill plus a `secondary` retry button.

## Camera_Screen layout

```
+-------------------------------------+
| (• status pill on scrim)   ( gear ) |  floating, no bar
|                                     |
|     full-bleed camera + lens chips  |  live: chips only
|                                     |
|   ┌ Guide dock: pill + panel ─────┐ |  only in Guide
|   └───────────────────────────────┘ |
| ╭─ bottom sheet (panel, xl top) ──╮ |
| │ ( Translate | Explore | Guide )  │ |  segmented, icons
| │            (  ◉  )               │ |  72 dp shutter: Hold while live
| ╰──────────────────────────────────╯ |
+-------------------------------------+
```

- Segmented control: one `surfaceRaised` track; equal segments with an icon and a label (two lines allowed, `maxFontSizeMultiplier` 1.3); selected segment raised in `primaryContainer` with an `outlineStrong` edge and a 700 label.
- Shutter: white ring with a filled disc, `iconOnly`, label "Hold this view" while live and "Take photo" otherwise; with a still shown, a `secondary` "Close photo" in the same 72 dp slot. Guide has no shutter.
- In Guide the top pill shows only a problem to act on; the dock gives the instructions.

## Overlays on the camera image

Overlay rules in `native-ux.md` and `visual-computer-vision.md` come first: solid backing behind text, 14 sp minimum, state as text. Then pick the look by what the screen is doing:

- **Live (Translate, Explore; D-054): lens chips only.** One `lens` chip per translated line, drawn over that line, sized to the translation (15 sp semibold white, `radius.sm`, `outlineStrong` edge). No outlines, no state colours, no pending or failed boxes; the status pill says what is happening and a tap on a chip opens the full text with its state. Chips are keyed by their text inside `GlideView`, so on the next frame they slide to the line's new place instead of blinking. Translate hides lines already in the target language and, while live, unreadable-script noise.
- **Held still (shutter): every label with its state.** Label beside the line (or over it when no spot is free), state colour plus marker text, two-tone outline, tap for the detail sheet.
- **Guide target (D-055):** one ring at a time, `target` outside and `ringDark` inside, `radius.md`, in `GlideView` + `PulseView` (opacity; static under reduced motion), with a `ringDark` label in `target` text and a `next` icon. Goal boxes in the goal picker are two-tone outlines with no drawn text (`iconOnly`), the line text is their spoken label.

All of these are 2D marks on the latest frame. Never call them tracking, world-anchored or AR in UI copy or docs.

## Guide dock (D-055)

Hands-free after one choice. The camera reads on its own, so goal lines arrive as chips. The mic is a 72 dp `primary` orb with a visible "Say it" that turns `dangerContainer` and breathes while listening. A recognised goal starts planning at once; Stop on the planning card undoes it. Each step is read aloud once.

Step card: "Step N" `Title` + AI badge pill + speak icon button; the instruction as `Headline`; notes as `Note` / `IconRow`; a waiting chip; one row with Done (primary, check), Back, Retry or Check now only when the camera did not see the change, and Stop (destructive, far end); "may be wrong" as a muted `IconRow`. The planner name is a small scrim pill above the card, not a panel.

## Motion

Motion explains a change of place or state; it never decorates. Reanimated is imported only in `ui/motion/motion.tsx`.

- Press: ripple, plus a 0.97 scale on primary buttons, the shutter and the orb.
- Panels and Guide states: `FadeInView` (fade and 12 dp rise, enter 240 decelerate; fade out 160).
- Status text cross-fades (state 180).
- Live chips and the Guide target glide (`GlideView`, 260 standard). This is the only motion tied to camera geometry, and it only follows a new frame; it never predicts.
- Breathing: the target ring (opacity) and the listening orb (scale), via `PulseView`.
- Every animation has a static path: layout animations use `ReduceMotion.System`; `PulseView` reads `useReduceMotion()`, which starts as reduced.

## Localisation and accessibility as design rules

- Test every layout with the longest string in `en`, `hi` and `kn` and at system font scale 1.3. Wrapping is the design; truncation and overlap are bugs.
- All text through `t(key)`. A new visible string needs rows in all three locale files (Hindi and Kannada marked `unreviewed`).
- 48 dp targets, a role and a translated label on every touchable, icon-only ones included.
- Contrast is a test, not a feeling: text pairs ≥ 4.5:1, rings and icons ≥ 3:1 against their neighbour.

## Method for changing a screen

1. Screenshot the current screen on the phone (loop below). Name what is text-heavy, cluttered, flat, misaligned, inconsistent or empty.
2. Decide with tokens and parts first. A new colour, size or component is a `theme.ts` or `parts.tsx` change, then used everywhere it applies.
3. Change the screen. Keep logic in hooks; views only arrange parts.
4. Screenshot again in `en`, `hi` and `kn` and at font scale 1.3, with real text in front of the camera (a mock machine page on the laptop screen works). Fix what looks off before moving on.
5. Run `npm run typecheck`, `npm run lint`, `npm test`.

### Screenshot loop (Windows)

```bash
adb devices                                            # phone listed as "device"
adb -s <serial> reverse tcp:8081 tcp:8081              # debug build loads JS from Metro on the host
adb -s <serial> exec-out screencap -p > shot.png       # phone: one display
adb shell dumpsys SurfaceFlinger --display-id          # emulator with several displays: pick the id,
adb exec-out screencap -d <display-id> -p > shot.png   # then pass it to screencap
adb shell settings put system font_scale 1.3           # large-font pass; set back to 1.0 after
```

- An APK built for the phone is arm64 only and will not start on an x86_64 emulator; build with `-PreactNativeArchitectures=x86_64` for the emulator, `arm64-v8a` for the phone.
- After a native change (anything under `modules/` or a new native package) rebuild the APK; Metro alone will not pick it up. Fast Refresh can stop applying after many edits: force-stop and start the app.
- A screenshot proves layout and contrast of chrome and chips on that frame, never alignment on real text over time (that is `physical-device-qa`).

## Definition of done for a screen

- Tokens only; no raw hex or magic sizes in the view.
- One primary action, visible; destructive last and outlined.
- Every touchable through `A11yButton`, every glyph through `Icon`, every animation through `motion.tsx` with a static path.
- On the live image: lens chips only. On a held still: labels with state. In Guide: one target ring.
- Empty and error states drawn as state cards.
- Survives `hi`, `kn` and font scale 1.3 with nothing clipped or truncated; screenshots saved under `.scratch/design/`.
- Typecheck, lint and tests green.
