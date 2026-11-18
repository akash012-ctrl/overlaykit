# OverlayKit: product contract

Status: **draft, awaiting approval** (2026-11-17)
Related: [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md), [QUALITY-GATES.md](QUALITY-GATES.md), [DEVICE-TESTS.md](DEVICE-TESTS.md), [../tasks/plan.md](../tasks/plan.md)

## Purpose

OverlayKit is a camera-first mobile app for someone standing at a machine (first case: a ticket machine) whose labels are in a language they don't read well. It draws translations on top of the text in the camera image, explains machine components the user taps, and gives step-by-step instructions only for machines the team has verified.

## Platforms

- **Android phone**: first and reference target. Built locally with Gradle (D-002).
- **iOS**: same codebase, but not built or validated during the hackathon because the host is Windows and EAS is excluded (D-003).
- No web, desktop, or browser UI of any kind.

## Rules (non-negotiable)

| ID | Rule |
| --- | --- |
| P1 | Expo-only mobile app with exactly three modes: Translate, Explore, Guide. |
| P2 | Camera-first. The app opens to the camera view. |
| P3 | Languages are English (`en`), Hindi (`hi`) and Kannada (`kn`). Voice is offered only when the device has a voice for that language. |
| P4 | General OCR translation uses a real translation provider. No demo-only glossary or canned translations for arbitrary text. Each language pair uses on-device ML Kit if it passes G2, otherwise OpenRouter (D-027, D-028). Errors and unsupported inputs show a visible fallback. |
| P5 | OCR runs on the device where possible. Cloud translation may receive **text only**, over HTTPS: through our backend proxy, or directly to OpenRouter when the user has saved their own OpenRouter key (D-028). No image leaves the device by default. |
| P6 | Step-by-step instructions exist only for verified known machines. Unsupported machines can be translated and explored, but the app never invents operating steps. |
| P7 | No login and no accounts. An optional OpenRouter API key in Settings is not an OverlayKit account (D-028). |
| P8 | No UI for browsers or the web. |

## Modes

| Mode | User action | App shows | App never |
| --- | --- | --- | --- |
| Translate | Points the camera at text. | The translation in the target language, drawn over the source text's position. Each label carries a status: translated, pending, failed, or unsupported. | Shows a translation that did not come from the translation provider. Uploads the image. |
| Explore | Taps a label or component in the camera view. | On a verified machine: the authored explanation of that component in the user's language. On any other machine: the tapped label's translation plus a "Not a verified machine" note. | Guesses what a component on an unverified machine does. |
| Guide | Picks a task on a recognized, verified machine. | One step at a time, with the target component highlighted in the camera view, step text (and voice when available), and a checkpoint before moving on. | Offers steps when the machine is unrecognized or the match is ambiguous. Generates or machine-translates steps at runtime. |

## Language support

| Capability | English | Hindi | Kannada |
| --- | --- | --- | --- |
| App UI text | Yes | Yes, unreviewed (D-031) | Yes, unreviewed (D-031) |
| Translation target | Yes | Yes | Yes |
| Source text read by on-device OCR | Yes (Latin script) | Yes (Devanagari) | **No, see note** |
| Verified-machine content (explanations, steps) | Yes | Yes, unreviewed (D-031) | Yes, unreviewed (D-031) |
| Voice (text-to-speech) | If the device has a voice | If the device has a voice | If the device has a voice |

**Kannada OCR note.** The leading on-device OCR candidate, Google ML Kit Text Recognition v2, lists Latin and Devanagari among its supported scripts. Kannada is absent from its supported, experimental, and mapped language lists (checked 2026-11-17 at developers.google.com/ml-kit/vision/text-recognition/v2/languages). Unless the G1 spike finds a workable on-device alternative, Kannada text in the camera image shows the "unsupported script" fallback. Kannada stays a full target, UI, and content language. See D-005, which needs approval.

## Verified machine fixture (TM-01)

TM-01 is the single ticket machine that Guide supports. Its form is open question Q2:

| Option | Pros | Cons |
| --- | --- | --- |
| (a) A real public ticket machine | Most realistic | Limited access for repeated testing; brand and trademark risk under the hackathon IP rule; screens can't be controlled |
| (b) A self-authored, real-size printed kiosk panel plus printed screen cards (recommended) | Keeps one app; repeatable; no third-party IP; screen changes are physical and seen only by the camera | Less realistic than a live screen |
| (c) A first-party kiosk simulator app on a second phone | Realistic screen changes | A second Expo app in the repo, which conflicts with "exactly one Expo app" unless you approve it |

For (b) and (c), the demo and submission must call TM-01 a first-party simulated machine, not support for a real-world machine.

A machine counts as **verified** only when all of the following are true and recorded in its fixture file:

1. The team listed the panel's components with their positions relative to fixed panel text (anchors), and each screen's identifying text.
2. Each workflow was performed on the fixture and each step's expected visible result was written down.
3. Every explanation and step exists in `en`, `hi` and `kn`, and the `hi` and `kn` text carries a review status. With no fluent reviewer (D-031) the status is `unreviewed`, and the README, demo and Devpost text say so. If a reviewer is added later, the reviewer and date are recorded.
4. The fixture passes the identification gates in QUALITY-GATES.md, including zero false matches on the negative set.

## Hackathon constraints

From the Kiroween 2026 rules (kiroween.devpost.com/rules, checked 2026-11-17):

- Submission deadline: **4 Dec 2026, 2:00 pm Pacific** (5 Dec, 3:30 am IST). No extensions. Our target is 3 Dec.
- Public GitHub repository with an **open-source license file** visible in the repo's About section. (The template's MIT LICENSE, which carried Expo's copyright, was removed during scaffolding. We need our own, see D-021.)
- `/.kiro` committed at the repository root, showing real use of specs, hooks, and steering. It must never be gitignored.
- A URL to a functional, installable app for judges. We'll use a locally built release APK, without EAS (D-018).
- Demo video shorter than 3 minutes.
- Original work that doesn't infringe third-party IP. This is one reason for preferring fixture option (b).

## Primary end-to-end scenario (S1)

**Actor:** a user who reads Kannada, standing at TM-01, whose panel labels are in English.
**Device:** the reference Android phone. **Network:** needed for cloud translation only (if the chosen provider is cloud). OCR, Explore content and Guide work offline.

1. The user opens OverlayKit. The camera view appears with no login. On first run only, the app asks for camera permission and shows a one-screen privacy note: images stay on the phone, and recognized text may be sent for translation.
2. The user sets the target language to Kannada. The choice is remembered.
3. **Translate.** The user points the phone at the panel. The app reads the English labels on the phone and draws Kannada translations over each label. A label whose translation fails keeps its original text and shows a status marker.
4. **Explore.** The user taps the card-reader label. The app recognizes TM-01 and shows the authored Kannada explanation of the card reader.
5. **Guide.** The app confirms TM-01 and offers one task (working name "Buy a single-journey ticket" until TM-01 is chosen). Each step highlights its target component. A step advances when its checkpoint (for example, the expected screen text) appears in the camera image. Steps that the fixture marks as manual advance when the user taps Done.
6. If a Kannada voice is installed, a Speak control reads the current step. If not, the control is hidden.
7. The workflow ends at "Collect your ticket" and Guide returns to its start.

**S1-N (negative branch).** The user points at a different machine. Translate works as usual. Explore shows label translations with "Not a verified machine". Guide shows "This machine isn't verified, so step-by-step help is off" and offers Translate and Explore instead.

## Not built for the hackathon

- Any web app, web dashboard, admin UI, desktop app, or generic agent platform.
- Login, accounts, profiles, sync, or cloud history.
- Cloud image upload or cloud OCR.
- Reading Kannada-script text from the camera (unless D-005 changes).
- Steps for any machine other than TM-01. No fixture editor, remote catalogue, or user-submitted machines.
- AI- or LLM-generated explanations or instructions. The only LLM use is translating recognized text through OpenRouter (D-028).
- ARCore/ARKit world tracking, 3D anchors, or plane detection. Overlays are 2D and anchored to text in the image.
- Speech recognition or voice commands. Voice is text-to-speech output only.
- Payment, ticket purchase, or any connection to the machine itself.
- Analytics, ads, tracking, push notifications, or third-party crash reporting.
- iOS builds and iOS device validation. App Store and Play Store release.
- Languages other than `en`, `hi`, `kn`. Landscape orientation (the app is portrait-only).
- A second Expo app (kiosk simulator), unless approved under Q2.
- A second Explore fixture (for example a washing-machine panel), unless approved under Q8.
