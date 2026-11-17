---
inclusion: always
---

# Product: OverlayKit

Source of truth: `docs/PRODUCT.md` (contract, scenario S1, "Not built" list) and `docs/DECISIONS.md`. If this file disagrees with them, the docs win. Flag the conflict instead of picking one silently.

## User and problem

The user stands at a machine (first case: a ticket machine) or a sign whose text is in a language they don't read well. They need to know what the text says, what a control does, and, on a machine we have verified, exactly what to do next. Languages: English, Hindi, Kannada.

## Journeys

- **Translate:** the user points the camera at text and sees translations drawn over the source text. Every label shows one state: translated, pending, failed, or unsupported.
- **Explore:** the user taps a label or component. On the verified machine (TM-01) they get its authored explanation. Anywhere else they get the label's translation and "Not a verified machine". The app never guesses what an unverified component does.
- **Guide:** only for a machine identified as `verified` (not `ambiguous`, not `none`). One step at a time, with the target highlighted. A step advances only when the camera sees its checkpoint in two consecutive observations, or on Done for steps marked manual. Otherwise Guide refuses and offers Translate and Explore.

## Truthful capabilities

- Translations come from a real provider (chosen in G2). Never translate arbitrary text with a glossary, canned strings, or fixture content. Until a provider exists, show `TR_NOT_CONFIGURED`.
- The camera reads English and Hindi only. Kannada is a target, UI, content, and voice language (D-005).
- Overlays are 2D and anchored to text in the image. Never call them world tracking, SLAM, or ARCore/ARKit.
- Voice is offered only when the device has a voice for that language.
- Android is the only tested platform. iOS isn't built or validated (D-003).
- If TM-01 is a printed panel or a simulator, call it a first-party simulated machine, never real-world machine support.

## No hidden fixture state

The app learns the fixture's state only through the camera. Nothing carries fixture state to the app: no Bluetooth, network, shared storage, shared code, deep links, or timers. A kiosk simulator, if one is approved (Q2), shares nothing with the app.

## Boundaries

- Mobile only. No web UI, web routes, dashboards, desktop app, admin pages, or generic agent platform. The optional backend has no UI.
- No login, accounts, analytics, ads, or tracking.
- No image leaves the phone. Only text goes to the translation proxy.
- Anything outside `docs/PRODUCT.md` needs the owner's approval before work starts.
