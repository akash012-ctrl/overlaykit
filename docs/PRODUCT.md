# OverlayKit: product contract

Status: **updated 2026-11-19 for the any-machine Guide** (D-039 to D-043). Package and model picks still await owner approval.
Related: [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md), [QUALITY-GATES.md](QUALITY-GATES.md), [DEVICE-TESTS.md](DEVICE-TESTS.md), [../tasks/plan.md](../tasks/plan.md), [spec 05](../.kiro/specs/05-any-machine-guide/requirements.md)

## Purpose

OverlayKit is a camera-first mobile app for someone standing at a machine (first case: a ticket machine) whose labels are in a language they don't read well. The user points the camera at any machine, says what they want to do, and the app guides them one step at a time. It draws translations over the text in the camera image and highlights the text or control to press. The steps are AI suggestions planned on the phone. They can be wrong, and the app says so.

## Platforms

- **Android phone**: first and reference target. Built locally with Gradle (D-002).
- **iOS**: same codebase, but not built or validated during the hackathon because the host is Windows and EAS is excluded (D-003).
- No web, desktop, or browser UI of any kind.

## Rules (non-negotiable)

| ID | Rule |
| --- | --- |
| P1 | Expo-only mobile app with exactly three modes: Translate, Explore, Guide. |
| P2 | Camera-first. The app opens to the camera view. |
| P3 | Languages are English (`en`), Hindi (`hi`) and Kannada (`kn`). Voice output is offered only when the device has a voice for that language. Voice input is offered only when the phone's recognizer supports the language. |
| P4 | General OCR translation uses a real translation provider. No demo-only glossary or canned translations for arbitrary text. Each language pair uses on-device ML Kit if it passes G2, otherwise OpenRouter (D-027, D-028). Errors and unsupported inputs show a visible fallback. |
| P5 | OCR and step planning run on the device. Cloud translation may receive **text only**, over HTTPS: through our backend proxy, or directly to OpenRouter when the user has saved their own OpenRouter key (D-028). **No image leaves the device. No text leaves the device for planning** (D-040). The app sends no audio anywhere (D-042). |
| P6 | Guide works on any machine, with AI-planned steps (D-039). Every planned step is labeled "AI suggestion". The app never claims a plan is verified or correct, and it says when it cannot plan. It never invents a target: a step may point only at text that OCR found. |
| P7 | No login and no accounts. An optional OpenRouter API key in Settings is not an OverlayKit account (D-028). |
| P8 | No UI for browsers or the web. |

## Modes

| Mode | User action | App shows | App never |
| --- | --- | --- | --- |
| Translate | Points the camera at text. | The translation in the target language, drawn over the source text's position. Each label carries a status: translated, pending, failed, or unsupported. | Shows a translation that did not come from the translation provider. Uploads the image. |
| Explore | Taps a label in the camera view. | The tapped label's translation. | Claims to know what a control does. Explore gives no authored explanation (the TM-01 content is dropped, D-043). |
| Guide | Picks a goal by tapping recognized text or by voice, on any machine. | The goal as the app understood it, then one AI-suggested step at a time: step text in the user's language, a 2D highlight on the text or control to use (or what to enter), and Done. When the camera sees the expected change twice in a row, or the user taps Done, the next step shows. At the end, "Goal done". | Presses anything on the machine. Advances on a timer. Shows a step as verified. Guesses a target that OCR did not find. Hides that it cannot plan. |

### Guide: states the user can see

- **Planning**: the model is working. A cancel control is shown.
- **Step n**: the AI suggestion, the highlight (or "Not in view"), Done, Back, Stop.
- **Didn't see the change**: shown when the expected change has not appeared. Done, Retry, Back. Never auto-skips.
- **Can't plan** (`PL_CANNOT_PLAN`): the model is missing, failed, or gave nothing usable, or the camera has no readable text. Offers Translate and Explore.
- **Paused**: the camera lost the screen. Resumes only on new observations.
- **Goal done**.

## Language support

| Capability | English | Hindi | Kannada |
| --- | --- | --- | --- |
| App UI text | Yes | Yes, unreviewed (D-031) | Yes, unreviewed (D-031) |
| Translation target | Yes | Yes | Yes |
| Source text read by on-device OCR | Yes (Latin script) | Yes (Devanagari) | **No, see note** |
| Planning input (OCR text and goal) | Yes | Yes, quality to be measured | No (no Kannada OCR) |
| Step text shown to the user | Yes | Yes, machine-translated (text only) | Yes, machine-translated (text only) |
| Voice input (goal) | If the phone's recognizer supports it | If the phone's recognizer supports it | If the phone's recognizer supports it |
| Voice output (text-to-speech) | If the device has a voice | If the device has a voice | If the device has a voice |

Step text in Hindi and Kannada is the planner's text passed through the translation provider (D-027, D-028). It is unreviewed (D-031) and is not authored content.

**Kannada OCR note.** The leading on-device OCR candidate, Google ML Kit Text Recognition v2, lists Latin and Devanagari among its supported scripts. Kannada is absent from its supported, experimental, and mapped language lists (checked 2026-11-17 at developers.google.com/ml-kit/vision/text-recognition/v2/languages). Unless the G1 spike finds a workable on-device alternative, Kannada text in the camera image shows the "unsupported script" fallback. Kannada stays a target, UI and voice language. See D-005.

## Machines

There is no verified-machine list and no fixture. TM-01 and its content are dropped (D-043). The owner tests on real machines. The app learns what is on the machine only through the camera. Nothing carries machine state to the app: no Bluetooth, network, shared storage, shared code, deep links, or timers.

## Hackathon constraints

From the Kiroween 2026 rules (kiroween.devpost.com/rules, checked 2026-11-17):

- Submission deadline: **4 Dec 2026, 2:00 pm Pacific** (5 Dec, 3:30 am IST). No extensions. Our target is 3 Dec.
- Public GitHub repository with an **open-source license file** visible in the repo's About section. (The template's MIT LICENSE, which carried Expo's copyright, was removed during scaffolding. We need our own, see D-021.)
- `/.kiro` committed at the repository root, showing real use of specs, hooks, and steering. It must never be gitignored.
- A URL to a functional, installable app for judges. We'll use a locally built release APK, without EAS (D-018).
- Demo video shorter than 3 minutes.
- Original work that doesn't infringe third-party IP. Demo on a machine we are allowed to film.

## Primary end-to-end scenario (S2)

**Actor:** a user at a ticket machine whose labels are in English or Hindi, who reads Kannada.
**Device:** the reference Android phone. **Network:** needed only for cloud translation (if the chosen provider is cloud) and for the one-time model download. OCR and planning work offline.

1. The user opens OverlayKit. The camera view appears, no login. First run only: camera permission and a privacy note (images stay on the phone; planning stays on the phone; recognized text may be sent for translation only).
2. The user sets the target language to Kannada.
3. **Translate** works as before.
4. The user switches to Guide and points the phone at the machine. The app reads the screen text.
5. The user taps a line such as "Buy ticket", or taps the mic and says the goal. The app shows the goal it understood.
6. The model plans. The Step card shows "AI suggestion", the step in Kannada, and a 2D highlight on the target text.
7. The user presses the control on the machine. The screen changes. The camera sees the expected text in two observations in a row, and the next step shows. If the user prefers, they tap Done.
8. At the last step the app shows "Goal done".
9. **Negative branch (S2-N).** The camera sees no readable text, the model is missing, or the model's plan names text that is not on screen. The app says "Can't plan this" with the reason and offers Translate and Explore.

## Not built for the hackathon

- Any web app, web dashboard, admin UI, desktop app, or generic agent platform.
- Login, accounts, profiles, sync, or cloud history.
- Cloud image upload or cloud OCR. Cloud or server-side step planning.
- Reading Kannada-script text from the camera (unless D-005 changes).
- Authored or verified machine content: no fixtures, no TM-01, no remote catalogue, no user-submitted machines.
- Claiming that a plan is correct, or that the app "knows" the machine.
- ARCore/ARKit, "AR", world tracking, 3D anchors, or plane detection. Overlays are 2D and anchored to text in the image (D-041).
- Pressing, tapping, or connecting to the machine. Payment or ticket purchase by the app.
- Keeping or uploading audio recordings. Always-on listening or a wake word.
- Analytics, ads, tracking, push notifications, or third-party crash reporting.
- iOS builds and iOS device validation. App Store and Play Store release.
- Languages other than `en`, `hi`, `kn`. Landscape orientation (the app is portrait-only).
- A second Expo app.
