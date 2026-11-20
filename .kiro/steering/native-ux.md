---
inclusion: fileMatch
fileMatchPattern: ["src/app/**/*.tsx", "src/modules/ui/**/*.tsx", "src/modules/capture/**/*.tsx"]
---

# Native UX rules

This file applies to Expo Router routes, `ui` views, and the camera preview view in `capture`. Visual design (tokens, parts, overlays, motion, the screenshot loop): `.kiro/skills/ui-design-system/SKILL.md`. Product journeys: `docs/PRODUCT.md`. Error states the UI must cover: `docs/ARCHITECTURE.md` §8.

## Screens and navigation

- The app opens straight to the camera screen, which has the Translate / Explore / Guide switcher. The other screen is Settings. Any new route needs approval.
- The only first-run steps are the camera permission prompt and a one-screen privacy note. No login or sign-up.
- No web-only files: no `.web.tsx`, `+html.tsx`, or `+api.ts`.
- Route files render a `ui` screen. Logic lives in `ui` hooks.
- Every screen handles loading, permission denied or blocked, no text found, and each relevant error code. No blank screens, and no spinner without text.

## Readable overlays on a live camera image

- Overlay text always sits on a solid or near-opaque backing, never directly on the video. Text-to-backing contrast is at least 4.5:1 (WCAG AA).
- Overlay text never drops below 14 sp. When it doesn't fit, truncate with an ellipsis and let the user tap to see the full text. Don't shrink it further.
- Each label's state (translated, pending, failed, unsupported) shows as text or icon plus text, never colour alone.
- Guide target highlights use a thick outline and a short label, styled differently from translation labels.
- Labels don't cover their own target. Placement comes from `geometry`.

## Localization

- All user-facing strings go through `t(key)` from `locale`, with `en`, `hi`, and `kn` versions. No hard-coded user-facing text in views.
- Hindi and Kannada lines run longer and taller than English:
  - No fixed heights on text containers.
  - Allow wrapping, and use generous `lineHeight`.
  - Test with the longest string in each language.
  - Make sure marks above and below the line are never clipped.
- Use whole-sentence keys with placeholders. Never join translated fragments.
- Use system fonts with Devanagari and Kannada coverage, and check rendering on the device (DT-G2-01). Don't force a Latin-only custom font.

## Accessibility

- Every touchable has an `accessibilityRole` and an `accessibilityLabel` in the current UI language. Tappable overlays expose their text.
- Touch targets are at least 48 × 48 dp.
- Keep system font scaling on. Layouts must survive the largest system font size.
- Announce mode changes and new Guide steps with `AccessibilityInfo.announceForAccessibility`.
- Reduced motion: check `AccessibilityInfo.isReduceMotionEnabled()` (or Reanimated's `useReducedMotion` if Reanimated is kept). When it's on, use static outlines instead of pulsing or animated highlights.

## Small devices and contrast

- Design for a 360 dp wide portrait screen (the app is portrait-only). Put primary controls at the bottom, within thumb reach.
- Respect safe-area insets (`react-native-safe-area-context`).
- Camera UI uses dark translucent bars with white text and must stay legible in bright light (condition L1 in `docs/DEVICE-TESTS.md`).
