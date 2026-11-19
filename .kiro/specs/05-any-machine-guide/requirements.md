# Requirements Document

Status: **draft, written 2026-11-19 without a review pause; revised the same day for the Gemma route.** Based on owner decisions 1 to 6 of 2026-11-19, recorded as D-039 to D-043 in `docs/DECISIONS.md`, on the Gemma, speech and model decisions recorded as D-045 to D-048, and on the updated `docs/PRODUCT.md`. Open questions OQ-1 to OQ-8 use their recommended defaults until the owner decides them. The runtime is LiteRT-LM through a local Kotlin Expo Module (D-045, no npm package). The default on-device model is Gemma 4 E2B, downloaded in the app on the user's tap (D-049); Gemma 3 1B IT int4, sideload only, is the small fallback (D-048). The user can instead choose Google Gemini Live, a cloud planner that is off by default and opt-in (D-049, D-050). `expo-speech-recognition` is approved (D-046). Nothing is installed by writing this document; `expo-secure-store` for the Gemini Live key is proposed and waits for the owner.

## Introduction

This spec replaces the verified-machine Guide of spec 03 (`.kiro/specs/03-guided-ticket-workflow`). Guide now works on any machine:

1. The app opens on the camera (unchanged, P2).
2. The user points it at a machine and picks a goal by tapping recognized text, or by voice.
3. A planner plans one step at a time from the goal and the OCR text. The user chooses the planner: the on-device model (default, D-040) or Gemini Live (cloud, opt-in, D-050).
4. The app draws a 2D highlight on the text or control to use, or shows what to enter, and labels the step "AI suggestion" (D-039, D-041).
5. A step advances when the camera sees the expected change in two consecutive, distinct observations, or when the user taps Done (D-043, D-019).
6. When the app cannot plan, it says so (`PL_CANNOT_PLAN`) and offers Translate and Explore.

What this spec adds:

- A `StepPlanner` provider interface and two adapters, in a new `planner` module: LiteRT-LM with Gemma (on-device) and Gemini Live (cloud). A setting picks one. Vendor types never leave the module.
- A `SpeechInput` provider interface and its adapter, in the `speech` module.
- Pure functions in `guide` for grounding a planned step on OCR text, building and checking the expected change, and a reducer for AI-planned steps (adapted from the spec 03 reducer).
- `ui` views for goal picking, planning, the AI-suggestion Step card, and the "can't plan" state.
- Shared `PL_*` and `SP_*` error codes with UI states.

**Reuses, unchanged:** `capture` (camera stills), `ocr` (ML Kit adapter), `geometry` (image-to-view conversion, label placement), the Overlay_Layer and `ui/guide` highlight views, `locale` (UI strings and text-only translation), the mode switcher.

**Dropped:** TM-01 and all fixture content (D-043). Spec 03 task 4 is cancelled. Spec 03's `components` fixture types and `guide` workflow loader stay in the tree until task 16 removes the unused ones with the owner's agreement. The new Guide path does not import them.

**Out of scope:** pressing anything on the machine, cloud planning other than the opt-in Gemini Live (D-050), image or audio upload except while Gemini Live is on, ARCore/ARKit or any "AR" wording, iOS, a second Expo app, accounts, analytics, a machine catalogue, reading Kannada script from the camera (D-005), and text-to-speech output (spec D owns it; the Speak slot stays hidden until then).

**Library-neutral requirements.** Requirements below name no vendor. The candidates are in `design.md`.

**Thresholds.** Numeric thresholds copied from older docs are *(proposed; any change needs a DECISIONS.md entry)*. Values this spec does not know are Named threshold constants, unset until measured on the Reference phone and recorded in `docs/DECISIONS.md`. This document invents no values for them. Until set, the matcher says "cannot tell" and Guide cannot advance on real frames.

**Device criteria.** A criterion tagged "Device" counts only with a PASSED record in `docs/DEVICE-TESTS.md` naming the build commit, variant, device and date. Until then: "device validation pending". The owner tests by hand on real machines (D-043); there is no fixture and no test machine in this spec.

**Tests are optional and last** (owner decision 6). Test tasks carry the `*` marker. Existing tests stay untouched and are never deleted, skipped or weakened. Unit-test acceptance criteria below stay as the contract the tests will check when the owner asks for them.

## Glossary

- **OverlayKit_App**: the Expo Android app in this repository.
- **Camera_Screen**: the `ui` screen at the index route.
- **Overlay_Layer**: the part of the Camera_Screen that draws 2D overlays over the shown still, anchored to OCR text.
- **Goal**: what the user wants to do at the machine, as short text (for example "Buy 2 tickets"). It has a source: `tap` (a recognized line was tapped, the Goal is that line's text), or `voice` (the recognizer's transcript, which the user can edit or reject).
- **StepPlanner**: the provider interface in the `planner` module. Its input is a PlanRequest. Its output is a PlannerOutput. One adapter runs an on-device model. Another talks to Gemini Live.
- **Planner_Choice**: the saved setting `on-device` (default) or `gemini-live`.
- **Live_Session**: one WebSocket session with Gemini Live, from "Start Gemini Live" to Stop or an error. It exists only while the Live_Banner is shown.
- **Live_Banner**: the persistent on-screen strip "Streaming to Google" with a red dot and a Stop control.
- **Live_Consent**: the stored answer to the Gemini Live consent screen, with the consent text version.
- **PlanRequest**: Goal text, the OCR lines of the current frame (id and text only), the steps done so far (their text only), and the frame id. No image, no coordinates.
- **PlannerOutput**: one of: a proposed next step; "goal looks done"; "cannot plan" with a reason. It is unchecked model output.
- **ProposedStep**: instruction text, an action (`press`, `enter`, `read`, `wait`), target text, and an expected change.
- **GroundedStep**: a ProposedStep whose target was matched to exactly one OCR line of the PlanRequest's frame, and whose expected change was checked against that frame. This is what Guide shows.
- **Expectation**: the expected change of a step: text lines that should appear and text lines that should disappear. Or `manual` when nothing visible is expected.
- **Observation**: the result of checking an OcrResult against the current Expectation. It keeps the frame id.
- **Step_Card**: the `ui` panel that shows the current step and the label "AI suggestion".
- **SpeechInput**: the provider interface in the `speech` module. It turns the user's speech into transcript text.
- **Reference phone**: the Android phone named under owner question Q4.
- **guide / planner / speech / geometry / shared / ui / locale / ocr / capture modules**: `src/modules/<name>/`, as in ARCHITECTURE.md section 4. `planner` is new.

## Requirements

### Requirement 1: Goal by tap

**User Story:** As a user at a machine, I want to tap a line of text on the screen to say what I want to do, so that I don't have to type.

1. WHEN the mode is Guide and no Goal is set, THE Guide_Screen SHALL show the recognized lines of the latest frame as tappable items over the image (Overlay_Layer, positions from `geometry`).
2. WHEN the user taps a recognized line, THE OverlayKit_App SHALL set the Goal to that line's original text, with source `tap`, and show it.
3. THE OverlayKit_App SHALL show the Goal in the user's language by the translation provider (text only), together with the original text. IF the translation fails, THE OverlayKit_App SHALL show the original text and the label state `failed`.
4. THE user SHALL be able to clear the Goal and pick another at any time.
5. IF the frame has no readable text, THEN THE OverlayKit_App SHALL show `PL_NO_TEXT` ("I can't read any text here. Move closer or add light.") and no tappable items.

### Requirement 2: Goal by voice

**User Story:** As a user, I want to say my goal, so that I can describe something that is not written on the screen.

1. THE Guide_Screen SHALL show a microphone control only when `SpeechInput.isAvailable(language)` is true for the user's language. Otherwise it SHALL show no microphone control, and tap input still works.
2. WHEN the user taps the microphone for the first time, THE OverlayKit_App SHALL show what the recognizer does with audio (design.md section "Speech and privacy") before the Android permission request.
3. IF the user denies the permission, THEN THE OverlayKit_App SHALL show `SP_PERMISSION_DENIED` and keep tap input.
4. WHEN recognition returns a final transcript, THE OverlayKit_App SHALL show it as an editable Goal with source `voice`, and SHALL NOT start planning until the user confirms it.
5. IF recognition returns no speech, an error, or an unsupported language, THEN THE OverlayKit_App SHALL show the matching `SP_*` state and SHALL NOT set a Goal.
6. THE OverlayKit_App SHALL NOT record, store or upload audio. Listening runs only while the user holds or has tapped the microphone, with a visible indicator, and stops on leaving Guide, on backgrounding, and after the maximum listening time.
7. Voice SHALL set the Goal only. Voice SHALL NOT advance, skip or confirm a step.

### Requirement 3: On-device planning

**User Story:** As a user, I want the app to work out the next step from what the camera sees, without sending my screen anywhere.

1. WHEN a Goal is confirmed, or a step is accepted, THE OverlayKit_App SHALL build a PlanRequest from the Goal, the lines of the latest usable frame, and the done steps, and call `StepPlanner.planNext`.
2. THE PlanRequest SHALL contain only text and ids. It SHALL NOT contain image data, file paths of images, quads, or device identifiers.
3. WHEN Planner_Choice is `on-device`, THE StepPlanner adapter SHALL run the model on the phone, and THE OverlayKit_App SHALL NOT send the PlanRequest, the Goal, OCR text or the output to any server for planning. A source search for network calls under `planner` SHALL find them only in `model-store` / the model download (R4, no user data) and in `adapters/gemini-live.ts` (R16, reachable only after consent).
4. WHILE planning, THE Guide_Screen SHALL show a "Planning" state with a Cancel control. Cancel SHALL stop the model call and return to the Goal.
5. THE StepPlanner SHALL return a `Result` with a `PL_*` code on failure. It SHALL NOT throw across the module boundary.
6. IF planning does not finish within `PLAN_TIMEOUT_MS` (Named threshold, unset until measured), THEN THE StepPlanner SHALL stop it and return `PL_TIMEOUT`.
7. THE planner SHALL ask for one next step, not a whole plan. After each accepted step, THE OverlayKit_App SHALL plan again from the new frame.
8. Model output SHALL be constrained to a fixed JSON shape (design.md). Output that does not parse or does not match the shape SHALL return `PL_BAD_OUTPUT`. The app SHALL NOT repair or guess missing fields.

### Requirement 4: Model availability (on-device planner)

**User Story:** As a user, I want to know whether the on-device planner is ready, and what it costs me to get it.

1. THE OverlayKit_App SHALL show the on-device planner state in Guide: `missing`, `downloading` (with progress), `ready`, `loading`, `failed`.
2. IF the default model (Gemma 4 E2B, D-049) is missing, THEN Guide SHALL show `PL_NO_MODEL` with its size (about 2.6 GB), a Wi-Fi advice line, the free space needed, and a **Download** button. THE OverlayKit_App SHALL download only after the user taps Download. The download SHALL show progress, SHALL be cancellable, SHALL resume after an interruption, and SHALL write to a temporary file that is renamed only after the size and SHA-256 match the pinned values. THE download SHALL send no user data, and no token or login SHALL be needed (the file is public, Apache-2.0).
3. THE OverlayKit_App SHALL check the model file against its pinned size and SHA-256 before first use. A file that fails the check gives `PL_NO_MODEL`. The app SHALL delete only its own failed temporary download and SHALL NOT delete a file the owner pushed. The model SHALL NOT be bundled in the APK.
4. THE OverlayKit_App SHALL load the model only after the user opened Guide with Planner_Choice `on-device`, and SHALL release it when the app is backgrounded for longer than `MODEL_IDLE_RELEASE_MS` (Named threshold, unset).
5. IF the phone cannot load the model (not enough memory, unsupported chip), THEN Guide SHALL show `PL_UNSUPPORTED_DEVICE`, not retry in a loop, and offer Translate, Explore, and (when the owner pushed it) the Gemma 3 1B fallback. It SHALL name Gemini Live as a choice only as an opt-in in Settings and SHALL NOT switch to it by itself.
6. Device: model size on disk, download time, load time, peak memory and time to the first token SHALL be measured on the Reference phone and recorded in `docs/DEVICE-TESTS.md` for Gemma 4 E2B, and for Gemma 3 1B if it is used.
7. THE OverlayKit_App SHALL name the model, its source and its licence on the model setup screen and in the app's licence notices. Gemma 4 E2B is Apache-2.0: keep the licence text and an attribution line. Gemma 3 1B (fallback) is under the Gemma Terms of Use (D-047, D-048): only if it is used or shared, THE OverlayKit_App SHALL carry the Notice text file with the sentence "Gemma is provided under and subject to the Gemma Terms of Use found at gemma.ai/resources/terms", the Prohibited Use Policy restrictions, and a copy or link of the terms, before any build or link is given to other people.
### Requirement 5: Grounding and honesty

**User Story:** As a user, I want a highlight only where the app really saw the text, and I want to know the step is a suggestion.

1. THE OverlayKit_App SHALL accept a ProposedStep only after grounding: its `targetText` SHALL match exactly one OCR line of the PlanRequest's frame, by normalized text (Unicode NFC, trimmed, case-folded, whitespace collapsed). Zero or several matches SHALL give `PL_TARGET_NOT_FOUND`, and the step SHALL NOT be shown.
2. THE target highlight SHALL be placed by `geometry` from that line's quad and the frame id. No coordinate math in `ui`.
3. IF the action is `enter`, THEN THE Step_Card SHALL show what kind of value to enter (for example "your number of tickets"). THE OverlayKit_App SHALL NOT invent a value for personal data (names, numbers, card or ID data).
4. THE Step_Card SHALL show the label "AI suggestion" on every planned step, and a short line "This may be wrong. Check the machine." The label SHALL NOT be removable by settings.
5. THE OverlayKit_App SHALL NOT describe a step, goal or plan as verified, confirmed, correct or known, in any string, README, demo or Devpost text.
6. WHEN the target line is not visible in the latest frame, THE Step_Card SHALL show "Not in view" and no highlight. It SHALL NOT draw a highlight at an old position.
7. A highlight SHALL carry its source frame id and expire (D-020).
8. Overlays SHALL be 2D. No string, identifier or document SHALL say AR, augmented reality, ARCore, ARKit, SLAM or world tracking, except to say the app does not use them.

### Requirement 6: Cannot plan

**User Story:** As a user, I want to be told clearly when the app cannot help.

1. WHEN planning returns `PL_CANNOT_PLAN`, `PL_BAD_OUTPUT`, `PL_TARGET_NOT_FOUND`, `PL_TIMEOUT`, `PL_NO_MODEL`, `PL_UNSUPPORTED_DEVICE` or `PL_NO_TEXT`, THE Guide_Screen SHALL show the state for that code (design.md error table), the reason in plain words, and Translate and Explore buttons.
2. FOR `PL_BAD_OUTPUT`, `PL_TARGET_NOT_FOUND` and `PL_TIMEOUT`, THE Guide_Screen SHALL also offer "Try again" (one new planning call). It SHALL NOT retry by itself more than once.
3. THE OverlayKit_App SHALL NOT fall back to a canned step, a keyword rule, a fixture, or any text the model did not produce.
4. Every `PL_*` and `SP_*` code SHALL map to one UI state in `ui/guide/error-map.ts`, with a unit test (optional, task 15*).

### Requirement 7: Step advance

**User Story:** As a user, I want the next step to show when the machine has really changed, or when I say so.

1. A GroundedStep SHALL carry an Expectation built from the ProposedStep by `buildExpectation(proposed, ocr)`:
   - `appear` keeps only lines that are NOT in the planning frame.
   - `disappear` keeps only lines that ARE in the planning frame.
   - IF both lists become empty, THE Expectation SHALL be `manual`.
2. WHEN a new OcrResult arrives for the current step, THE `evaluateExpectation` function SHALL return `met` only if every `appear` line is present and every `disappear` line is absent, by the same normalization as R5.1. It SHALL return `cannot-tell` for a manual step or when the OcrResult has `OCR_LOW_QUALITY`. It SHALL return `not-met` otherwise.
3. THE reducer SHALL advance a step only after two consecutive accepted Observations, both `met`, with different frame ids and strictly increasing capture times (D-019). A `not-met` or `cannot-tell` Observation SHALL reset the streak.
4. WHEN the user taps Done, THE reducer SHALL advance the current step, for any step. THE Done control SHALL be visible on every step.
5. A step SHALL advance exactly once. Duplicate or out-of-order Observations SHALL change nothing.
6. A timer, a speech result, a model output, or an app event other than R7.3 and R7.4 SHALL NOT advance a step.
7. IF `GOAL_NOT_SEEN_LIMIT` consecutive `not-met` Observations are accepted (Named threshold, unset), THEN Guide SHALL show `GD_CHECKPOINT_NOT_SEEN` ("I didn't see the change I expected. Check the machine.") with Done, Retry and Back. It SHALL NOT skip by itself.
8. WHEN the user taps Back, THE reducer SHALL return to the previous step state and re-plan from the latest frame. Re-planning SHALL NOT erase the advance record.
9. EACH advance SHALL record a proof: the step id, the cause (`observed` with two frame ids, or `done`), and the ordinal. The proof SHALL contain no image and no OCR text.

### Requirement 8: Finishing a goal

1. WHEN the planner returns "goal looks done", THE Guide_Screen SHALL show "This looks finished (AI suggestion)" with "Finish" and "Not yet". The reducer SHALL complete only on "Finish". "Not yet" SHALL plan again.
2. THE user SHALL be able to stop Guide at any time ("Stop"). Stop SHALL cancel any planning call and listening, and return to the camera view with Translate and Explore available.
3. WHEN the user changes mode or leaves the screen, Guide SHALL cancel (unmount is the cancel).
4. A maximum of `MAX_STEPS_PER_GOAL` steps (Named threshold, unset) SHALL apply. At the limit, Guide SHALL show `PL_CANNOT_PLAN` ("This is taking too many steps") and offer Stop.

### Requirement 9: Screen lost and backgrounding

1. IF the latest frames show no overlap with the lines of the planning frame for `SCENE_LOST_TIMEOUT_MS` (Named threshold, unset; spec 03 proposed 3 s), THEN Guide SHALL pause with `GD_MACHINE_LOST` ("I lost the screen. Point the camera at it again.").
2. A pause SHALL keep the step. Resuming SHALL need a new Observation with a capture time later than the pause. A timer SHALL NOT resume.
3. WHEN the app goes to the background, or the camera is interrupted, Guide SHALL pause and release the camera and the microphone. On return it SHALL show the paused state with Resume and Stop.
4. WHEN the scene changes to a different screen on purpose (the user pressed something), THE reducer SHALL treat it through R7 only. The app SHALL NOT claim to know which machine is in view.

### Requirement 10: Privacy and boundaries

1. **No image leaves the phone unless the user turns on Gemini Live** (D-050). WITH Planner_Choice `on-device`, no image, no pixel data and no text SHALL leave the phone for planning (D-040). A source search of `guide` and `speech` SHALL find no `fetch`, `XMLHttpRequest`, `WebSocket`, `Linking`, or Bluetooth use. The only network code under `planner` is the model download in `planner/model-store` (no user data) and `planner/adapters/gemini-live.ts` plus its live session helper (R16). Both are listed in the review.
2. THE only text that leaves the phone in Guide SHALL be text sent to the translation provider under D-027 and D-028, as in Translate. Guide SHALL show the same privacy note.
3. THE OverlayKit_App SHALL NOT store or log audio, frames or transcripts, and SHALL NOT upload audio or frames except in a Live_Session (R16). Transcripts SHALL NOT be stored beyond the current Goal and SHALL NOT be logged.
4. THE microphone permission SHALL be requested only on the first tap of a microphone control (voice goal or Start Gemini Live). The manifest SHALL contain `RECORD_AUDIO` because the owner approved the speech package (D-046). The camera config (`recordAudioAndroid: false`, D-036) SHALL stay.
5. THE Google API key SHALL NOT be in the repository, the bundle, logs, error text or crash text. THE OverlayKit_App SHALL have no login, accounts, analytics, ads or tracking. Telemetry of any dependency SHALL be off. A dependency that sends telemetry by default SHALL be configured off before first use, and the build SHALL be checked for it.
6. No fixture state SHALL reach the app except through the camera. No Bluetooth, network, shared storage, deep link or timer carries machine state.

### Requirement 11: Languages

1. THE planner input SHALL be the Goal and OCR text as read (English or Hindi). Kannada script is not read by OCR (D-005); a Kannada voice Goal SHALL be handled per R11.3.
2. THE planner SHALL output step text in English. THE OverlayKit_App SHALL show the step in the user's language by the translation provider (text only, on-device when D-030 allows) and SHALL keep the English text available. Hindi and Kannada step text is machine-translated and unreviewed (D-031).
3. IF the voice language differs from the languages the planner is measured on, THEN THE OverlayKit_App SHALL show the transcript for the user to confirm (R2.4), and SHALL say if planning quality for that language is unmeasured. It SHALL NOT claim support it has not measured.
4. THE Step_Card SHALL use `t(key)` strings for all fixed text, in `en`, `hi` and `kn`. New `hi` and `kn` strings are unreviewed drafts (D-031).

### Requirement 12: Error states

1. THE shared module SHALL define `PL_*` (including `PL_LIVE_NO_KEY`, `PL_LIVE_AUTH`, `PL_LIVE_QUOTA`, `PL_LIVE_NETWORK`, `PL_LIVE_SESSION_ENDED`, `PL_LIVE_MIC_DENIED`) and `SP_*` codes, and the `PlannerChoice` type (append only). `GD_UNSUPPORTED`, `GD_MACHINE_CHANGED` and `GD_FIXTURE_INVALID` SHALL stay defined but SHALL NOT be emitted by the new path. `GD_MACHINE_LOST` and `GD_CHECKPOINT_NOT_SEEN` stay in use.
2. EVERY code SHALL map to one UI state with text, an action and a next step (design.md table).
3. Failures SHALL be `Result` values. No exception SHALL cross a module boundary.

### Requirement 13: Architecture

1. THE new `planner` module SHALL expose its API only through `planner/index.ts` and SHALL depend only on `shared`.
2. THE `speech` module SHALL depend only on `shared`. The `SpeechInput` adapter SHALL be the only file that imports the vendor package.
3. THE `guide` module SHALL NOT import `planner`, `speech`, `ui`, `capture`, `ocr` or `locale`. It SHALL import React nowhere.
4. `ui` SHALL be the only place where `planner`, `speech`, `guide`, `geometry`, `ocr` and `capture` are wired together.
5. THE StepPlanner and SpeechInput vendor packages SHALL be added to the lint `VENDOR_OWNERS` list, each limited to its adapter file. `expo-secure-store` SHALL be limited to `planner/live-key-store.ts`, and `modules/overlaykit-live` to `planner/adapters/gemini-live.ts` and its live session helper.
6. Swapping a runtime or model SHALL change one adapter and add a DECISIONS.md entry.
7. THE Gemini Live adapter SHALL implement the same `StepPlanner` interface. `ui` SHALL choose the adapter from Planner_Choice. `guide` SHALL NOT know which planner ran.

### Requirement 14: Quality gate (G5, proposed)

1. A new gate G5 "any-machine Guide" SHALL replace G4 in `docs/QUALITY-GATES.md` (task 17). Its acceptance items are the Device criteria below. Its numeric thresholds stay unset until measured. The gate is Passed only with `docs/DEVICE-TESTS.md` records.
2. AT-G5-01 (Device): on three different real machines chosen by the owner, with a Goal picked by tap, the app plans a first step, highlights a grounded target, and the owner can follow it. Each run is recorded as PASSED, FAILED or NOT TESTED, with the machine described by the owner.
3. AT-G5-02 (Device): a step advances on two consecutive `met` Observations on a real machine, and on Done. No advance happens on a timer (observed over a 60 s idle run).
4. AT-G5-03 (Device): a plan that names text not on screen shows `PL_TARGET_NOT_FOUND`, not a highlight.
5. AT-G5-04 (Device): airplane mode with the model present: planning works, and no network request occurs during planning (record how this was observed).
6. AT-G5-05 (Device): voice Goal in English and in Hindi, if the phone supports them; unsupported languages show `SP_LANGUAGE_UNSUPPORTED`.
7. AT-G5-06 (Device): pushed model file missing, wrong size or wrong checksum: each is rejected with `PL_NO_MODEL`; the right file loads.
8. AT-G5-07 (Device): load time, time per step, peak memory and battery use are measured on a release build and recorded. Thresholds are set from these numbers in a DECISIONS.md entry before they gate anything.
9. AT-G5-08 (Review): the vision-safety review finds no claim of "verified", "correct", "AR" or "world tracking", and no image or text leaving the phone for planning with Planner_Choice `on-device`. With `gemini-live`, it finds the consent screen, banner, Stop and send gate as in R16.
10. AT-G5-09 (Device): with Gemini Live never turned on, a network trace of a full Guide run shows no connection to Google AI endpoints. After declining consent, still none. Record how it was observed.
11. AT-G5-10 (Device): with Gemini Live on, the banner is visible for the whole session, Stop ends the stream within a second, backgrounding ends it, and no file, gallery item or log line holds a frame, audio or the key.
12. AT-G5-11 (Device): one real goal on a real machine with Gemini Live: the step is grounded on an exact OCR line, or `PL_TARGET_NOT_FOUND` shows. A bad key shows `PL_LIVE_AUTH`. Airplane mode shows `PL_LIVE_NETWORK` and Guide keeps on-device available.
13. AT-G5-12 (Device): Gemma 4 E2B download on the phone: progress, cancel, resume, SHA-256 mismatch rejected, enough-space check, and the planner loads or shows `PL_UNSUPPORTED_DEVICE`.

### Requirement 15: Planner choice

**User Story:** As a user, I want to choose between a planner that stays on my phone and a cloud planner, and keep the private one unless I decide otherwise.

1. THE Settings screen SHALL show a "Planner" choice with two values: "On this phone" (`on-device`) and "Gemini Live (Google, cloud)" (`gemini-live`). The saved default SHALL be `on-device`, also after an app update and after a failed or declined attempt to turn Gemini Live on.
2. THE StepPlanner used by Guide SHALL be chosen from Planner_Choice in `ui` only. Guide logic (grounding, expectation, reducer) SHALL be the same for both.
3. THE OverlayKit_App SHALL NOT change Planner_Choice to `gemini-live` by itself, after any error, timeout, missing model or low memory. A change from `gemini-live` to `on-device` MAY happen by itself after a Live_Session error and SHALL be shown to the user.
4. `gemini-live` SHALL be selectable only after a valid key is saved (R17) and Live_Consent is stored (R16.2). Otherwise the row opens the consent or key screen, and Planner_Choice stays `on-device`.
5. The Guide planner state line SHALL name the active planner ("On this phone: Gemma 4" or "Gemini Live (Google)").
6. Both planners SHALL give the same step label "AI suggestion" and the note "This may be wrong. Check the machine."

### Requirement 16: Gemini Live planner (opt-in)

**User Story:** As a user who chooses it, I want Google's live model to watch the camera and listen to me, while I can always see that it is streaming and stop it.

1. THE `gemini-live` adapter SHALL open one WebSocket Live_Session to Google (`generativelanguage.googleapis.com`, WSS only) with the user's key, with the model id constant `gemini-3.8-live` (D-050), response modality audio, output transcription on, and function declarations for `show_step`, `goal_finished` and `cannot_plan`.
2. BEFORE the first Live_Session, THE OverlayKit_App SHALL show the Live_Consent screen (R16.3). THE consent SHALL be stored with a text version. A new version asks again. Declining SHALL leave Planner_Choice `on-device` and send nothing.
3. THE consent screen SHALL: name Google; list what is sent (camera frames about once a second and scaled down, microphone audio, the goal text, and the text lines the camera read); list what comes back; say the app cannot see or delete the data at Google; say a free-tier key may let Google use the content to improve its products; say the on-device planner sends none of this; and offer "Agree and turn on" and "No, keep on-device". It SHALL be written in plain words and shown in the user's language (`en`, `hi`, `kn`, unreviewed drafts, D-031).
4. EVERY Live_Session SHALL start only after the user taps "Start Gemini Live" in Guide. Opening the app, opening Guide or picking a Goal SHALL NOT start one.
5. WHILE a Live_Session is connecting or open, THE Live_Banner SHALL be on screen with a Stop control. THE ui send gate SHALL pass frames and audio to the adapter only while the banner is shown. Stop SHALL close the socket, stop the camera frame feed and the microphone, and clear the session handle. Stop SHALL work while connecting.
6. A Live_Session SHALL end on Stop, on leaving Guide, on backgrounding, on goal done, on any connection error, on `GoAway` without a successful resume, and after `LIVE_IDLE_STOP_MS` (Named threshold, unset).
7. THE adapter SHALL send each camera frame as a JPEG scaled so its long edge is at most 768 px (Google's recommended size), at most once per `LIVE_FRAME_INTERVAL_MS` (Named threshold; Google's limit is 1 frame per second, so it SHALL NOT be below 1000). The frame sent SHALL be the same still OCR read, so the frame id ties the model's answer to one OcrResult. Alongside each new frame, THE adapter SHALL send a text message with the frame id and the OCR lines (id and text) and the Goal.
8. THE model SHALL answer with a function call: `show_step` carries the English instruction, the action, the target text (copied from one listed line), an optional enter hint, and the expected appear and disappear text. THE adapter SHALL turn it into a `PlannerOutput` and run `parseOutput`'s strict checks. It SHALL send the function response with the matching call id and a status. Anything else (free text, malformed call) SHALL give `PL_BAD_OUTPUT`. The model SHALL NOT supply coordinates, and the app SHALL NOT use any it supplies.
9. GROUNDING SHALL be the same as for Gemma (R5): the target text must match exactly one OCR line of the frame, else `PL_TARGET_NOT_FOUND`. A step older than `LIVE_STEP_MAX_AGE_MS` (Named threshold, unset) or tied to a frame the user moved away from SHALL NOT be highlighted.
10. THE adapter SHALL ask for context window compression and session resumption, and handle `GoAway` (connection about 10 minutes; audio plus video sessions about 2 minutes without compression). WHEN resumption fails, THE session SHALL end with `PL_LIVE_SESSION_ENDED`.
11. THE model's audio reply SHALL NOT be played in v1 (OQ-9). THE app SHALL use the function call and the transcript text only, and SHALL show the transcript text only as a caption labelled "AI suggestion".
12. NO frame, audio chunk, transcript, key or URL SHALL be written to disk or to logs. A Live_Session SHALL leave no file behind.
13. Failures SHALL be `Result` values with `PL_LIVE_*` codes (R12): `PL_LIVE_NO_KEY`, `PL_LIVE_AUTH` (key rejected), `PL_LIVE_QUOTA` (quota or billing), `PL_LIVE_NETWORK`, `PL_LIVE_SESSION_ENDED`, `PL_LIVE_MIC_DENIED`. Each maps to one UI state with an action.
14. Device: the first frame, the first function call, the round trip per step, battery and data use SHALL be measured on the Reference phone and recorded. Kannada and Hindi quality with Gemini Live is unmeasured until recorded.

### Requirement 17: Google API key

**User Story:** As a user, I want to use my own Google key and be sure it stays on my phone.

1. THE Settings screen SHALL let the user paste, replace and remove a Google API key, shown masked after saving (last four characters).
2. THE key SHALL be stored only in Android Keystore-backed secure storage. It SHALL NOT be in the repo, `app.json`, the bundle, AsyncStorage, files, logs, error text or analytics (none exist).
3. THE key SHALL be sent only to `generativelanguage.googleapis.com` over WSS. Because the documented WebSocket form puts it in the URL query, no code SHALL log, show or attach the URL to an error.
4. Removing the key SHALL end any Live_Session, and set Planner_Choice to `on-device`.
5. THE key check SHALL happen by opening a session when the user starts one. THE app SHALL NOT call any Google endpoint when the user only saves a key.

## Open Questions

| ID | Question | Recommended default |
| --- | --- | --- |
| OQ-1 | Which model? (decided, D-049, replaces D-048) | Default: Gemma 4 E2B `gemma-4-E2B-it.litertlm` (2.59 GB, Apache-2.0, public). Fallback: Gemma 3 1B IT int4 (584 MB, gated, sideload only, Gemma terms). |
| OQ-2 | Where does the model file come from? | Gemma 4 E2B: in-app download on the user's tap from the public Hugging Face file, SHA-256 checked (D-049). Gemma 3 1B: owner `adb push` only (D-048); no token in the app. |
| OQ-3 | Plan one step or the whole route at once? | One step at a time (R3.7): it is simpler for a small model and uses the current screen. |
| OQ-4 | Should the planner see Hindi text directly? | Yes, as read. Quality is measured in task 14 and reported. |
| OQ-5 | Speech engine on-device only, or also the phone's default (may use network)? | Request on-device when the language pack is present. Otherwise tell the user, and let them choose tap input. |
| OQ-6 | Remove unused TM-01 and fixture code? | Yes, in task 16, after the owner agrees. Existing tests that cover it stay until then. |
| OQ-7 | Where is the capture cadence for Guide set? | Reuse the spec 03 constant, unset until measured on the phone. |
| OQ-8 | May `hi` and `kn` Step text be machine-translated and shown without a reviewer? | Yes, labeled unreviewed (D-031). |
| OQ-9 | Should the app play Gemini Live's spoken reply? | Not in v1: it needs 24 kHz PCM playback (a second native piece) and the app is built around highlights and text. Decide after the first device run. |
| OQ-10 | How does the user give the goal in Gemini Live mode? | By tap or typed text, as today. Spoken follow-up questions go straight to Gemini Live through the open microphone. The on-device voice goal (xpo-speech-recognition) is not used while a Live_Session holds the microphone. Confirm with the owner. |
| OQ-11 | Does the owner accept xpo-secure-store for the key, and the local Kotlin module modules/overlaykit-live for microphone PCM and JPEG scaling? | Recommended yes (D-050). Waiting for the owner. |
| OQ-12 | Does the owner have a Google API key, and is a free-tier key acceptable given that Google may use free-tier content to improve products? | Recommended: a paid-tier key for any real machine. Waiting for the owner. |
