# Design Document: any-machine-guide

Status: **draft, 2026-11-19.** Implements `requirements.md` under D-039 to D-043. No code is written by this document. Package and model choices are **Proposed**; the owner approves before any install.

## Overview

Guide works on any machine. The user picks a goal (tap or voice). An on-device model proposes one next step from the goal and the OCR text. The app checks the step against the OCR text (grounding), draws a 2D highlight, and labels it "AI suggestion". The step advances on two consecutive camera observations of the expected change, or on Done. When the app cannot plan, it says so.

### Design decisions in this document

| # | Decision | Why |
| --- | --- | --- |
| DD-1 | The planner returns **one next step** per call. | A 1 to 2 billion parameter model plans a whole route badly. The next step uses the screen the user is looking at. |
| DD-2 | Model output is constrained by a JSON grammar, then **grounded** by pure code. | The model may name text that is not on screen. Pure code decides what is shown. |
| DD-3 | The planner writes **English** step text. `locale` translates it (text only). | Small models are weaker in Hindi and Kannada. Translation already exists (D-027, D-028, D-030). |
| DD-4 | The expectation is **diffed against the planning frame**: only text that is new counts as "appear", only text that was there counts as "disappear". | Stops a step from being "met" at once by text that was already on screen. |
| DD-5 | The new reducer is a **copy-and-adapt** of the spec 03 reducer in `guide/plan/`. The old files stay until task 16. | Lets lanes work in parallel without breaking spec 03 code or its tests. |
| DD-6 | The plan-shape types live in `shared`. | `planner` and `guide` may not import each other. `shared` is the only common layer (ARCHITECTURE.md section 5). |
| DD-7 | `speech` holds speech **input** now. Text-to-speech (spec D) joins the same module later. | One module per capability family. |

## Architecture

### Module map

```
app (src/app) -> ui
ui       -> guide, planner, speech, geometry, ocr, capture, locale, shared
guide    -> geometry, shared          (components no longer needed on this path)
planner  -> shared
speech   -> shared
geometry, ocr, capture, locale -> shared
shared   -> nothing
```

`planner` is a new module and needs a row in ARCHITECTURE.md section 4 (task 17).

### Flow

```
camera still -> ocr -> OcrResult(frameId, lines)
                         |
 Goal (tap line / voice) |
        v                v
   PlanRequest{goal, lines[id,text], done[], frameId}      (ui builds it)
        v
   StepPlanner.planNext  (planner module, on device, no network)
        v
   PlannerOutput (unchecked)
        v
   groundStep(output, ocr)           (guide, pure)  -> GroundedStep | PL_* code
        v
   guideReducer(event: plan-ready)   (guide, pure)
        v
   ui: Step_Card "AI suggestion" + HighlightLayer (geometry places the quad)
        v
   next OcrResult -> evaluateExpectation -> Observation -> guideReducer
        two consecutive 'met' (distinct frames, rising time)  OR  Done  -> advance
        advance -> plan again from the newest frame
```

### Guide status machine

| Status | Meaning | Leaves on |
| --- | --- | --- |
| `idle` | No goal. | `goal-set` |
| `planning` | Waiting for the planner. | `plan-ready`, `plan-failed`, `cancel` |
| `showing` | A GroundedStep is the current step. | observation x2, `done`, `back`, `lost`, `cancel` |
| `proposed-finish` | Model said the goal looks done. | `finish`, `not-yet` |
| `paused` | Screen lost or app backgrounded. | newer observation, `cancel` |
| `cannot-plan` | A `PL_*` code is set. | `retry`, `cancel` |
| `completed` | User chose Finish. | `reset` |
| `cancelled` | User stopped. | `reset` |

`planning` is entered after `goal-set` and after each advance and `back`.

### File layout

```
src/modules/shared/index.ts            (append: PL_*, SP_*, plan-shape types)
src/modules/planner/
  index.ts                             (public API: StepPlanner, createStepPlanner, model-store API)
  types.ts                             (PlannerState, ModelInfo)
  prompt.ts                            (buildPrompt(PlanRequest): pure, vendor-neutral)
  schema.ts                            (JSON schema + GBNF text; parseOutput(raw): Result)
  model-store.ts                       (download, verify, delete; the only network code)
  adapters/llama.ts                    (only file importing the runtime package)
src/modules/speech/
  index.ts                             (SpeechInput API)
  types.ts
  adapters/android-recognizer.ts       (only file importing the speech package)
src/modules/guide/plan/
  types.ts  ground.ts  expectation.ts  reducer.ts  constants.ts  index.ts
src/modules/ui/guide/
  (existing files stay; new:) GoalPicker.tsx, VoiceGoal.tsx, PlanningView.tsx,
  ModelGate.tsx, CannotPlanView.tsx, FinishPrompt.tsx, usePlanGuide.ts, plan-view-model.ts
  (changed:) StepCard.tsx (AI label), error-map.ts (PL_*, SP_* rows), GuideScreen.tsx (new flow)
src/modules/locale/strings/{en,hi,kn}.ts  (append keys, ui lane only)
modules/overlaykit-llm/                (only if the Kotlin path is chosen, see Candidate packages)
```

## Components and Interfaces

### shared (append only)

```ts
export const PL_ERROR_CODES = [
  'PL_NO_MODEL', 'PL_UNSUPPORTED_DEVICE', 'PL_NO_TEXT', 'PL_CANNOT_PLAN',
  'PL_BAD_OUTPUT', 'PL_TARGET_NOT_FOUND', 'PL_TIMEOUT',
] as const;
export type PlErrorCode = (typeof PL_ERROR_CODES)[number];

export const SP_ERROR_CODES = [
  'SP_NOT_AVAILABLE', 'SP_PERMISSION_DENIED', 'SP_LANGUAGE_UNSUPPORTED',
  'SP_NO_SPEECH', 'SP_FAILED',
] as const;
export type SpErrorCode = (typeof SP_ERROR_CODES)[number];

export type PlanLine = { readonly lineId: string; readonly text: string };

export type PlanRequest = {
  readonly frameId: FrameId;
  readonly goal: string;                      // trimmed, max GOAL_MAX_CHARS (unset)
  readonly lines: readonly PlanLine[];        // lineId = `${frameId}#${index}`
  readonly done: readonly string[];           // English text of finished steps
};

export type PlanAction = 'press' | 'enter' | 'read' | 'wait';

export type ProposedStep = {
  readonly instruction: string;               // English
  readonly action: PlanAction;
  readonly targetText: string;                // must match one OCR line (grounding)
  readonly enterHint: string | null;          // kind of value for 'enter', never a value
  readonly appear: readonly string[];         // text expected to show after the step
  readonly disappear: readonly string[];
};

export type PlannerOutput =
  | { readonly kind: 'step'; readonly step: ProposedStep }
  | { readonly kind: 'finished' }
  | { readonly kind: 'cannot-plan'; readonly reason: string };   // reason: model text, shown as-is, never as a fact
```

Existing `GD_*` codes and the existing `error-codes.test.ts` rows stay. New codes are added as new rows only.

### planner

```ts
export interface StepPlanner {
  status(): PlannerState;                          // missing | downloading | ready | loading | failed
  subscribe(cb: (s: PlannerState) => void): () => void;
  /** Never throws. Resolves with a PL_* code on failure. */
  planNext(req: PlanRequest, signal: AbortSignal): Promise<Result<PlannerOutput, PlErrorCode>>;
  download(signal: AbortSignal): Promise<Result<void, PlErrorCode>>;
  release(): Promise<void>;
}
export function createStepPlanner(opts?: { /* model path, constants */ }): StepPlanner;
```

- `prompt.ts` builds the system and user text from a PlanRequest. It states: use only the listed lines; copy `targetText` exactly from one line; never output personal data; say `cannot-plan` when unsure. Pure, so it can be reviewed and snapshot-tested.
- `schema.ts` holds the JSON schema, the GBNF grammar derived from it, and `parseOutput(raw: string): Result<PlannerOutput, 'PL_BAD_OUTPUT'>`. Strict: unknown fields, wrong types, empty `targetText` for `press`, `enterHint` missing for `enter` all fail. No repair.
- `adapters/llama.ts` loads the GGUF from `model-store`, runs the completion with the grammar, stop tokens and a max-tokens cap, and honors `signal`. Vendor types stop at this file.
- `model-store.ts` downloads to app-private storage (`expo-file-system`, already installed, D-036), resumes, checks size and checksum against pinned values in `planner/model-manifest.ts`, deletes on mismatch. It is the only file with network code and sends no user data.

### speech

```ts
export interface SpeechInput {
  isAvailable(language: LocaleCode): Promise<boolean>;      // recognizer exists and supports the language
  listen(language: LocaleCode, signal: AbortSignal): Promise<Result<string, SpErrorCode>>; // final transcript
}
export function createSpeechInput(): SpeechInput;
```

The adapter asks the permission itself on the first `listen`. It prefers on-device recognition when the language pack is installed. It never persists audio (`recordingOptions.persist` stays false). It stops on abort, on timeout `LISTEN_MAX_MS` (unset), and when the app is backgrounded.

### guide/plan (pure)

```ts
groundStep(output: PlannerOutput, ocr: OcrResult): Result<GroundedStep | { finished: true }, PlErrorCode>;
buildExpectation(step: ProposedStep, ocr: OcrResult): Expectation;      // 'manual' | { appear, disappear }
evaluateExpectation(exp: Expectation, ocr: OcrResult): 'met' | 'not-met' | 'cannot-tell';
planReducer(state: PlanGuideState, event: PlanGuideEvent): PlanGuideState;
```

`GroundedStep = { id, instruction, action, enterHint, target: { lineId, quad, frameId }, expectation: Expectation }`.

- `normalizeText` (NFC, trim, case-fold, collapse whitespace) is one shared helper used by grounding and expectation, so both match the same way.
- Grounding picks the line by exact normalized match. It does not use fuzzy matching, so a wrong highlight cannot come from a near match. If OCR splits a button label over two lines, grounding fails (`PL_TARGET_NOT_FOUND`). *shortcut: exact match only; revisit with measured miss rate on real machines.*
- `PlanGuideEvent`: `goal-set`, `plan-ready(step)`, `plan-finished`, `plan-failed(code)`, `observation`, `done`, `back`, `retry`, `finish`, `not-yet`, `scene-lost`, `interrupted`, `cancel`, `reset`.
- The reducer keeps the spec 03 rules (accepted observation ids, frame ids and rising `seq`, streak of two, proofs) and drops fixture and machine fields. The advance function is the only place a step ordinal rises and it adds exactly one proof.
- Scene loss: `sceneOverlap(baselineLines, ocr)` returns the fraction of baseline lines still seen. Below `SCENE_OVERLAP_MIN` (unset) for `SCENE_LOST_TIMEOUT_MS` (unset) the `ui` sends `scene-lost`. With the constants unset the function returns `cannot-tell` and loss never fires.

### ui

- `usePlanGuide` owns the capture loop (reusing the spec 03 cadence and highlight code), calls the planner, grounds, dispatches events, and cancels on unmount.
- `GoalPicker` draws tappable boxes through `geometry` placement (no coordinate math in `ui`). `VoiceGoal` shows the mic and the editable transcript.
- `StepCard` shows the English-or-translated instruction, the "AI suggestion" label, "This may be wrong", the enter hint, Done, Back, Stop. The label has no off switch.
- `ModelGate` shows planner state and the Download button with the size.
- Highlight uses the existing `highlight-model.ts` and `HighlightLayer.tsx` fed from `GroundedStep.target`.

## Candidate packages (not installed)

Checked 2026-11-19 from npm metadata, GitHub and vendor docs. App versions: Expo `~58.0.26`, React Native `0.88.1`, `react-native-worklets` `0.13.0` (from `package.json`).

### On-device LLM runtime

| Candidate | Maintained? | New Architecture / SDK 58, RN 0.88 | Size | Hindi / Kannada | Licence | Local Kotlin module? | Source checked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`llama.rn`** 0.13.0-rc.12 (llama.cpp binding) | Yes: npm modified 2026-11-17, GitHub pushed 2026-11-19 | README: from v0.10 it requires the New Architecture. `peerDependencies` are `react: *`, `react-native: *`, so RN 0.88 is **not stated**; it must be proven by a build (task 3). Has Expo notes (config for OpenCL only, optional). | npm package 68 MB unpacked (all ABIs; prebuilt `.so` downloaded at postinstall from GitHub releases, SHA-256 checked). APK grows by the arm64 libraries only if `abiFilters` is set. | Depends on the model, not the runtime. | MIT | **No.** A config-plugin and `expo prebuild` are enough; no Kotlin of ours. | [github.com/mybigday/llama.rn](https://github.com/mybigday/llama.rn); `npm view llama.rn` |
| `@react-native-ai/llama` 0.13.0 | Yes (npm 2026-11-11) | Wraps `llama.rn >=0.13.0-rc.8`; adds a Vercel AI SDK style API we do not need | small | same as above | MIT | No | `npm view @react-native-ai/llama` |
| `react-native-executorch` 0.11.1 | Yes: npm 2026-11-19, GitHub pushed 2026-11-19 | Docs: New Architecture only, RN 0.83+, `react-native-worklets` `>=0.10.0 <0.14.0` (repo has 0.13.0, in range). Its compatibility table lists RN up to 0.86 and Expo SDK up to 57. **SDK 58 and RN 0.88 are not listed.** Also needs `react-native-blob-util` and `@kesha-antonov/react-native-background-downloader`, and Android 13+. Anonymous download telemetry is on by default and must be turned off (`setTelemetryEnabled(false)`), which matters under R10.5. | npm 10 MB; model files are `.pte` and large | Per model; curated models are in Software Mansion's Hugging Face collection (list not itemised here) | MIT | No | [docs.swmansion.com/react-native-executorch](https://docs.swmansion.com/react-native-executorch/docs/fundamentals/getting-started) and its [compatibility page](https://docs.swmansion.com/react-native-executorch/docs/other/compatibility) |
| MediaPipe LLM Inference (Android, via our own module) | **Maintenance-only**; Google recommends LiteRT-LM | Not an npm package; we would write it | Gemma-class `.task` files, 1 GB or more | Per model (Gemma) | Runtime Apache-2.0; Gemma models use the Gemma Terms of Use, not an OSI licence | **Yes, Kotlin Expo Module** (same pattern as D-036) | [Google AI Edge docs](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference) |
| LiteRT-LM (Android, via our own module) | Active (Google's recommended successor) | Same: our own module | per model | per model | Apache-2.0 (not re-checked) | **Yes, Kotlin Expo Module** | Same page (the migration notice). Licence and API not checked in detail. |
| `react-native-mediapipe` 0.6.0 | **No**: last npm update 2024-12-12; it is a vision-camera package, not an LLM runtime | Needs `react-native-vision-camera` | n/a | n/a | MIT | n/a | `npm view react-native-mediapipe` |

**Recommendation: `llama.rn`.** It is the only candidate with a maintained, ready JS API, GBNF/JSON-schema constrained output (needed for DD-2), stated New Architecture support, MIT licence, no Kotlin of ours, and no extra native packages. Risks: RN 0.88 is unproven (task 3 proves it with a build and a smoke call, and stops if it fails); the version on the `latest` tag is a release candidate (`0.13.0-rc.12`), so the exact version is pinned and the owner is told; the postinstall downloads native libraries from GitHub, so install needs network. Fallback if task 3 fails: LiteRT-LM through a local Kotlin Expo module (D-036 pattern), which needs its own decision.

### Model

| Model | Quantization / size | Licence | Languages | Notes |
| --- | --- | --- | --- | --- |
| **Qwen3-1.7B** (`unsloth/Qwen3-1.7B-GGUF`) | Q4_K_M, 1056 MB (read from the Hugging Face file listing) | Apache-2.0 | Qwen reports broad multilingual training. Hindi and Kannada quality at this size is **unmeasured**. The design avoids the question by planning in English (DD-3). | Recommended. Run with thinking off (`/no_think` or the template flag) to keep latency down. |
| Qwen2.5-1.5B-Instruct (`Qwen/Qwen2.5-1.5B-Instruct-GGUF`) | Q4_K_M, 1066 MB | Apache-2.0 | same caveat | Fallback: older, no thinking mode to turn off. |
| Qwen3-0.6B | Q4 about 0.4 GB (not measured) | Apache-2.0 | same caveat | Fallback for low-memory phones. Likely too weak for grounded JSON; test before use. |
| Llama-3.2-1B-Instruct (`bartowski/...-GGUF`) | Q4_K_M, 770 MB | Llama 3.2 Community Licence (not OSI) | Hindi is among its supported languages; Kannada is not | Not recommended: licence terms and no Kannada. |

All sizes are file sizes, not RAM. RAM, speed and heat on the Reference phone are unknown until task 14 measures them. The model is not bundled in the APK. Pinned URL, size and checksum go in `planner/model-manifest.ts` at task 5, from the real file.

### Speech recognition

| Candidate | Maintained? | New Arch / SDK 58 | Size | Hindi / Kannada | Licence | Local Kotlin module? | Source checked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`expo-speech-recognition`** 58.0.1 | Yes: npm 2026-10-29; its version number follows the SDK (58.x) | Expo Modules package, versioned for SDK 58. The README text I read does not say "New Architecture"; `npx expo install --check` and a build confirm (task 3). | npm 0.55 MB unpacked | Depends on the phone's recognizer. `getSupportedLocales()` lists installed on-device packs. Hindi (`hi-IN`) and Kannada (`kn-IN`) support on the Reference phone is **unverified**. | MIT | **No.** | [github.com/jamsch/expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition) |
| `@react-native-voice/voice` 3.2.4 | Slower: last npm update 2026-01-31 | Not stated; classic bridge module | small | Same dependence on the phone | MIT | No | `npm view @react-native-voice/voice` |

**Recommendation: `expo-speech-recognition`.** Android notes from its README: on-device recognition needs Android 13+ and an installed language pack; continuous mode and some options need Android 13+; `requiresOnDeviceRecognition: false` lets Android use its default service, which may send audio to a network service. The app therefore requests on-device when the pack exists and discloses otherwise (D-042, R2.2). It adds `RECORD_AUDIO`, which the `blockedPermissions` list (D-038) must not block for this package: task 3 checks `app.json`.

### What needs a local Expo Module in Kotlin

- **Nothing**, with `llama.rn` and `expo-speech-recognition`.
- Only the fallback runtime (LiteRT-LM, or MediaPipe LLM Inference) needs a local Kotlin Expo Module. That path is a separate decision and task lane K in `tasks.md`, which stays unstarted.
- Spec 01's OCR module (`modules/overlaykit-ocr`) already follows that pattern.

## Data Models

| Name | Where | Fields |
| --- | --- | --- |
| `Goal` | `ui` state | `text`, `source: 'tap' \| 'voice'`, `lineId?` |
| `Expectation` | `shared` or `guide/plan` | `'manual'` or `{ appear: string[], disappear: string[] }` (normalized) |
| `GroundedStep` | `guide/plan` | `id`, `instruction`, `action`, `enterHint`, `target { lineId, quad, frameId }`, `expectation` |
| `PlanGuideState` | `guide/plan` | `status`, `goal`, `done[]`, `step`, `streak[]`, `notSeenCount`, `lastSeq`, `notBeforeSeq`, `acceptedObservationIds[]`, `acceptedFrameIds[]`, `proofs[]`, `error` |
| `PlannerState` | `planner` | `{ kind: 'missing' } \| { kind: 'downloading', receivedBytes, totalBytes } \| { kind: 'ready' } \| { kind: 'loading' } \| { kind: 'failed', code }` |

## Error handling

| Code | Module | Cause | UI text | Actions |
| --- | --- | --- | --- | --- |
| `PL_NO_MODEL` | planner | Model file missing or failed its check | "The planner isn't on this phone yet. Download it (about 1 GB)." | Download; Translate; Explore |
| `PL_UNSUPPORTED_DEVICE` | planner | Model cannot load (memory, chip) | "This phone can't run the planner." | Translate; Explore |
| `PL_NO_TEXT` | planner/ui | No readable lines in the frame | "I can't read any text here. Move closer or add light." | Retry; Translate |
| `PL_CANNOT_PLAN` | planner | Model said it cannot plan, or step limit | "I can't plan this. {reason}" | Translate; Explore; Stop |
| `PL_BAD_OUTPUT` | planner | Output did not parse or match the shape | "I couldn't work out a step. Try again." | Try again; Translate; Explore |
| `PL_TARGET_NOT_FOUND` | guide | Target text is not one OCR line | "I couldn't find that on the screen." | Try again; Translate; Explore |
| `PL_TIMEOUT` | planner | `PLAN_TIMEOUT_MS` passed | "Planning took too long." | Try again; Translate |
| `SP_NOT_AVAILABLE` | speech | No recognizer on the phone | Mic hidden; note in Settings | Tap input |
| `SP_PERMISSION_DENIED` | speech | Microphone permission denied | "Microphone is off." | Tap input; open Settings |
| `SP_LANGUAGE_UNSUPPORTED` | speech | Recognizer lacks the language | "Voice isn't available in {language} on this phone." | Tap input |
| `SP_NO_SPEECH` | speech | Nothing heard | "I didn't hear anything." | Try again |
| `SP_FAILED` | speech | Recognizer error | "Voice input failed." | Try again; Tap input |
| `GD_MACHINE_LOST` | guide | Scene lost | "I lost the screen. Point the camera at it again." | Resume; Stop |
| `GD_CHECKPOINT_NOT_SEEN` | guide | Expected change not seen | "I didn't see the change I expected. Check the machine." | Done; Retry; Back |

`ui/guide/error-map.ts` gets the new rows. A missing mapping is a compile error through an exhaustive type, as for the existing codes.

## Correctness Properties

For the pure modules. Tests are optional and last; these are the contract they check.

- **P1.** A step ordinal rises by at most one per event.
- **P2.** Every advance has a cause: two consecutive accepted `met` observations, or Done. Its proof matches.
- **P3.** Duplicate observation ids, duplicate frame ids, and non-increasing `seq` change nothing.
- **P4.** Events other than `observation` and `done` never advance a step. No event carries a time that advances a step.
- **P5.** `plan-ready`, `plan-failed`, `goal-set`, `finish` and `not-yet` never advance a step.
- **P6.** Completion only through `finish` after `plan-finished`.
- **P7.** Pause and resume keep the step. Resume needs `seq` later than the pause.
- **P8.** `groundStep` returns a target only if exactly one OCR line of that frame matches; never from a near match.
- **P9.** `buildExpectation` output has no `appear` text that was in the planning frame and no `disappear` text that was not.
- **P10.** `evaluateExpectation` returns `met` only if all `appear` are present and all `disappear` are absent; `cannot-tell` for manual or low quality.
- **P11.** `parseOutput` accepts only the exact shape; any extra or missing field gives `PL_BAD_OUTPUT`.
- **P12.** Reducer and helpers are total, pure and deterministic. No clock, no random, no I/O.
- **P13.** `buildPrompt` output contains no pixels, quads or ids other than the line ids.

Property tests reuse fast-check (D-035) and the arbitraries in `test-support/`.

## Testing Strategy

Optional and last. Unit tests per pure function in `guide/plan`, `planner/schema.ts`, `planner/prompt.ts`. Inputs are recorded OCR snapshots from `test-fixtures/` where they exist; otherwise tests state the invented lines as such. Model output tests use fixed strings, not a real model. Real behavior is checked only by hand on the Reference phone (DEVICE-TESTS rows from task 17). Static checks (`npm run typecheck`, `npm run lint`, `npx expo-doctor`) run at every checkpoint.

### Device tests

New rows in `docs/DEVICE-TESTS.md`, all NOT TESTED until run: DT-G5-01 (three real machines, tap goal), DT-G5-02 (advance on camera and on Done, 60 s idle), DT-G5-03 (ungrounded plan), DT-G5-04 (airplane mode planning, no network), DT-G5-05 (voice en and hi), DT-G5-06 (model download interrupt, resume, corrupt), DT-G5-07 (release build speed, memory, battery), DT-G5-08 (backgrounding and screen loss), DT-ERR-PL (each PL and SP state).

## Open Questions

See `requirements.md` OQ-1 to OQ-8. Design-only points:

- **DQ-1.** GGUF checksum without a new package. `expo-file-system` may or may not offer a hash in SDK 58; task 5 checks. If it does not, the owner chooses between a size check plus GGUF header check, or approving a hashing package.
- **DQ-2.** `llama.rn` context size and thread count for the Reference phone. Set in task 14 from measurements.
- **DQ-3.** Hindi OCR lines in the prompt: whether to send Devanagari as read, or transliterate. Default: as read.

## Flagged items for the owner

1. Approve `llama.rn`, `expo-speech-recognition` and the model (Qwen3-1.7B Q4_K_M, about 1 GB, Apache-2.0). The `llama.rn` release on the `latest` tag is a release candidate.
2. RN 0.88 support of `llama.rn` is not stated by its docs. Task 3 builds a smoke test and stops if it fails.
3. Speech may send audio to Google's service unless an on-device pack exists. The app discloses this before first use.
4. A 1 GB model download and RAM use may not suit all phones.
5. Plans are AI suggestions and can be wrong. Demo and Devpost text must say so.
6. Gate G4 and spec 03 tasks tied to TM-01 are replaced (D-043).

## Traceability

| Requirement | Design |
| --- | --- |
| R1, R2 | GoalPicker, VoiceGoal, SpeechInput |
| R3, R4 | StepPlanner, model-store, prompt, schema |
| R5 | groundStep, StepCard label, geometry highlight |
| R6, R12 | Error handling table, error-map |
| R7, R8, R9 | planReducer, buildExpectation, evaluateExpectation, sceneOverlap |
| R10 | Module map, source searches, model-store as the only network code |
| R11 | DD-3, locale |
| R13 | Module map, lint VENDOR_OWNERS |
| R14 | Device tests, G5 |
