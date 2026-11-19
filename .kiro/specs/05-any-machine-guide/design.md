# Design Document: any-machine-guide

Status: **draft, revised 2026-11-19 for the Gemma route.** Implements `requirements.md` under D-039 to D-043 and D-045 to D-048 (owner chose Google on-device AI with Gemma, approved `expo-speech-recognition`, and chose Gemma 3 1B IT int4, sideload only). No code is written by this document. The runtime is our own Kotlin Expo Module around LiteRT-LM. The model is **Gemma 3 1B IT int4**, pushed to the phone by the owner (D-048). Gemma 4 E2B is a documented fallback only. Evidence and links: `.scratch/reports/spec-05-gemma-redesign.md`.

## Overview

Guide works on any machine. The user picks a goal (tap or voice). An on-device model proposes one next step from the goal and the OCR text. The app checks the step against the OCR text (grounding), draws a 2D highlight, and labels it "AI suggestion". The step advances on two consecutive camera observations of the expected change, or on Done. When the app cannot plan, it says so.

### Design decisions in this document

| # | Decision | Why |
| --- | --- | --- |
| DD-1 | The planner returns **one next step** per call. | A phone-size model (2 to 5 billion parameters) plans a whole route badly. The next step uses the screen the user is looking at. |
| DD-2 | Model output is asked for as JSON under a schema constraint when the pinned runtime supports it, then **always** strictly parsed and **grounded** by pure code. No repair. | The runtime constraint lowers the bad-output rate but has open bugs (report, section "Constrained output"). Parse and grounding are the safety net. The model may also name text that is not on screen. Pure code decides what is shown. |
| DD-3 | The planner writes **English** step text. `locale` translates it (text only). | Gemma lists 140+ languages, but Hindi and Kannada planning quality on this phone is unmeasured. Translation already exists (D-027, D-028, D-030). |
| DD-4 | The expectation is **diffed against the planning frame**: only text that is new counts as "appear", only text that was there counts as "disappear". | Stops a step from being "met" at once by text that was already on screen. |
| DD-5 | The new reducer is a **copy-and-adapt** of the spec 03 reducer in `guide/plan/`. The old files stay until task 16. | Lets lanes work in parallel without breaking spec 03 code or its tests. |
| DD-6 | The plan-shape types live in `shared`. | `planner` and `guide` may not import each other. `shared` is the only common layer (ARCHITECTURE.md section 5). |
| DD-7 | `speech` holds speech **input** now. Text-to-speech (spec D) joins the same module later. | One module per capability family. |
| DD-8 | The runtime is **LiteRT-LM** (Google AI Edge) in a **local Kotlin Expo Module** `modules/overlaykit-llm/`, called from `planner/adapters/litert.ts`. Same pattern as `modules/overlaykit-ocr` (D-036). | There is no maintained npm package for it. MediaPipe LLM Inference is maintenance-only. ML Kit GenAI / Gemini Nano does not list the reference phone. |
| DD-9 | The module holds one `Engine`, creates a **fresh `Conversation` per planning call**, runs speculative decoding **off**, and thinking and tools **off**. The module returns the raw model text (a string) and a code string to TypeScript. | Each PlanRequest is self-contained (goal, lines, done steps), so no history is needed. A fresh conversation keeps calls independent. Speculative decoding with a response format failed in a user report (LiteRT-LM issue 3944). No LiteRT-LM type crosses into JavaScript. |

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
  schema.ts                            (JSON schema text; parseOutput(raw): Result)
  model-store.ts                       (locate the pushed file, check size and SHA-256; no network code)
  model-manifest.ts                    (pinned URL, size, SHA-256)
  adapters/litert.ts                   (only file importing `modules/overlaykit-llm`)
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
modules/overlaykit-llm/                (lane K: local Kotlin Expo Module around LiteRT-LM, see "Local Kotlin module")
  expo-module.config.json  package.json  index.ts   (typed JS surface: strings and numbers only)
  android/build.gradle                              (litertlm-android dependency, pinned)
  android/src/main/AndroidManifest.xml              (optional GPU `uses-native-library` entries)
  android/src/main/java/com/overlaykit/llm/OverlaykitLlmModule.kt
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
  status(): PlannerState;                          // missing | ready | loading | failed
  subscribe(cb: (s: PlannerState) => void): () => void;
  /** Never throws. Resolves with a PL_* code on failure. */
  planNext(req: PlanRequest, signal: AbortSignal): Promise<Result<PlannerOutput, PlErrorCode>>;
  release(): Promise<void>;
}
export function createStepPlanner(opts?: { /* model path, constants */ }): StepPlanner;
```

- `prompt.ts` builds the system and user text from a PlanRequest. It states: use only the listed lines; copy `targetText` exactly from one line; never output personal data; say `cannot-plan` when unsure. Pure, so it can be reviewed and snapshot-tested.
- `schema.ts` holds the JSON schema (passed to the module as a string) and `parseOutput(raw: string): Result<PlannerOutput, 'PL_BAD_OUTPUT'>`. Strict: unknown fields, wrong types, empty `targetText` for `press`, `enterHint` missing for `enter` all fail. No repair. It parses whatever comes back, constrained or not.
- `adapters/litert.ts` is the only file that imports `modules/overlaykit-llm`. It loads the model file from `model-store`, calls `generate` with the prompt, the schema string and a max-output-token cap, calls `cancel` on `signal`, and maps the module's code strings to `PL_*`. It holds no LiteRT-LM type because the module exposes none.
- `model-store.ts` looks for the pushed file at the fixed path (see "Model file placement"), checks its size and SHA-256 against the pinned values in `planner/model-manifest.ts`, and reports `ready`, or `missing` with `PL_NO_MODEL`. It never downloads and never deletes the owner's file. It has no network code (D-048).

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
- `ModelGate` shows planner state. When the file is missing it shows the setup steps (log in, accept terms, download, `adb push`, exact path), not a download button.
- Highlight uses the existing `highlight-model.ts` and `HighlightLayer.tsx` fed from `GroundedStep.target`.

## Candidate packages (not installed)

Checked 2026-11-19 from vendor docs, repos and model cards (links in `.scratch/reports/spec-05-gemma-redesign.md`). App versions: Expo `~58.0.26`, React Native `0.88.1`, Android `minSdk` 24 (React Native catalog), New Architecture on (`newArchEnabled=true` in the generated `gradle.properties`). Reference phone: Redmi Note 12 Pro 5G, Android 14, 5.67 GB RAM (`docs/DEVICE-TESTS.md`).

### On-device LLM runtime (D-045)

| Option | Status | Fit for OverlayKit | Source checked |
| --- | --- | --- | --- |
| **LiteRT-LM**, Kotlin API `com.google.ai.edge.litertlm:litertlm-android` | Google's recommended runtime. README calls it production-ready; latest tagged release in the README is v0.19.0. Kotlin API listed as stable. Apache-2.0. | **Chosen.** CPU and GPU (NPU only on listed chips). Android AAR `minSdk` 24 (0.18.0). Needs a local Kotlin Expo Module (no npm package exists). Constrained output through LLGuidance (regex, JSON schema, Lark). Gradle risk: 0.17.x and 0.18.x carry Kotlin 2.4 metadata and need a Kotlin 2.3+ compiler. 0.16.1 builds with Kotlin 2.2, which is what the React Native 0.88 catalog lists. | [LiteRT-LM README](https://github.com/google-ai-edge/LiteRT-LM), [Kotlin guide](https://github.com/google-ai-edge/LiteRT-LM/blob/main/docs/api/kotlin/getting_started.md), [Android skill](https://github.com/android/skills/blob/main/device-ai/litert/litert-lm/SKILL.md) |
| MediaPipe LLM Inference (Android) | **Maintenance-only.** Google says new features go to LiteRT-LM and recommends migrating. | Not for new work. | [MediaPipe LLM Inference](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference) |
| ML Kit GenAI Prompt API (Gemini Nano through AICore) | Beta, "not subject to any SLA or deprecation policy". | **Not usable as the main path.** Runs Gemini Nano, not Gemma. Needs a phone on Google's per-API device list, API 26+, locked bootloader, app in the foreground, per-app quota. The lists I could read name Pixel 9 and later, Galaxy S26, OnePlus 13 and 15, Xiaomi 15 and similar. The Redmi Note 12 Pro 5G is not named. Optional later adapter behind `StepPlanner`, not in this spec. | [Prompt API](https://developers.google.com/ml-kit/genai/prompt/android), [device list as summarised by Capawesome](https://dev.to/capawesome/how-to-use-gemini-nano-in-a-capacitor-app-5fgf) (secondary source; the official list page did not load for me) |
| `llama.rn` with Qwen3-1.7B (earlier proposal) | Never approved. | **Dropped** by the owner's Gemma decision. | n/a |

### Model

All files are `.litertlm` bundles from the LiteRT Community, read from the Hugging Face API on 2026-11-19. Peak memory and speed are Google's numbers on other phones. **Nothing is measured on the reference phone yet.**

| Model | File and size | Licence and access | Phone numbers from Google (other phones) | Notes |
| --- | --- | --- | --- | --- |
| Gemma 4 E2B (documented fallback only, D-048) | `gemma-4-E2B-it.litertlm`, 2,588,147,712 bytes (2.59 GB), SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`, repo [`litert-community/gemma-4-E2B-it-litert-lm`](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) | **Apache-2.0, not gated** (`gated: false`). No account or token needed. | Galaxy S26 Ultra, CPU: about 47 tokens/s decode, time to first token 1.8 s, 1,733 MB peak CPU memory. GPU: 0.3 s, 676 MB. | 2.3B effective parameters. 140+ languages claimed; Hindi and Kannada planning quality is unmeasured. Text, image and audio inputs exist but are not used. Mixed 2, 4 and 8-bit weights. The newest and largest of the three. On a 5.67 GB phone, 1.7 GB peak plus the app is plausible but not proven. |
| **Gemma 3 1B IT, int4 (chosen, D-048)** | `gemma3-1b-it-int4.litertlm`, 584,417,280 bytes (584 MB), SHA-256 `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`, repo [`litert-community/Gemma3-1B-IT`](https://huggingface.co/litert-community/Gemma3-1B-IT) | Gemma Terms of Use. **Gated** (`gated: auto`): needs a Hugging Face login and a click on "Acknowledge licence". | Galaxy S24 Ultra, CPU, int4: about 55 tokens/s decode, about 1,009 MB peak. GPU: about 1,205 MB. | Text only. Smallest and fastest. Likely weaker at following a JSON shape and at Hindi; unmeasured. Chosen by the owner (D-048). Gemma 4 E2B is the documented fallback if this one is too weak. |
| Gemma 3n E2B (not recommended) | `gemma-3n-E2B-it-int4.litertlm`, 3,655,827,456 bytes (3.66 GB), repo [`google/gemma-3n-E2B-it-litert-lm`](https://huggingface.co/google/gemma-3n-E2B-it-litert-lm) | Gemma Terms of Use. **Gated, manual** approval (`gated: manual`). | S24 Ultra, CPU: about 16 tokens/s decode. | Larger, slower, older than Gemma 4 E2B, and needs manual approval. |

**Hosting and gate (D-048).** The chosen Gemma 3 1B file is gated: it needs the owner's Hugging Face login and an accepted licence. The owner downloads it and runs `adb push`. No token goes to the app or to any worker. The app is sideload-only for this file: no in-app download, and the model is never put in an APK or served by a link we publish. No authorised public mirror was found. The fallback Gemma 4 E2B file, which needs no login, can be downloaded over plain HTTPS from `https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm` with no login. Using it needs a new DECISIONS entry (D-048).

**Languages.** Hindi and Kannada are inside the "140+ languages" claim for Gemma 4 and Gemma 3. I found no per-language benchmark for either on these edge models. DD-3 keeps step text in English and translates it with `locale`, so the planner only has to read English or Hindi OCR lines. Task 14 measures Hindi; Kannada stays "unmeasured".

**Performance expectation.** The reference phone (mid-range, 5.67 GB) is slower than the S24 and S26 Ultra phones in Google's tables. Expect several times slower decode and a slow first load. No number is promised. A step is about 80 to 150 output tokens, so a step may take several seconds to tens of seconds. Task 14 measures it on a release build.

### Constrained output (DD-2)

- LiteRT-LM supports constrained decoding with LLGuidance: regex, JSON Schema or Lark grammar ([constrained-decoding doc](https://github.com/google-ai-edge/LiteRT-LM/blob/main/docs/api/cpp/constrained-decoding.md); that doc shows the C++ API).
- The Kotlin API exposes it as `ConversationConfig(enableResponseFormat = true)` and `sendMessageAsync(text, responseFormat = ResponseFormat.json(schema))`. I saw this only in a user's bug report on 0.17.0 ([issue 3944](https://github.com/google-ai-edge/LiteRT-LM/issues/3944)), not on a Google doc page. Task 12.1 confirms the exact names in the pinned version before any code depends on them.
- The same report found: with speculative decoding off, 56 of 60 calls returned valid JSON and 4 timed out. With speculative decoding on, no call was usable. Therefore the module keeps speculative decoding off (DD-9). The report also lists related open issues for thinking mode and for tools combined with a response format, so the module uses neither.
- If the pinned version has no usable response format, the fallback is the current design: ask for JSON in the prompt, parse strictly, return `PL_BAD_OUTPUT` on any mismatch, and allow one "Try again" (R6.2). Grounding stays the last check in both cases.

### Speech recognition

| Candidate | Maintained? | New Arch / SDK 58 | Size | Hindi / Kannada | Licence | Local Kotlin module? | Source checked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`expo-speech-recognition`** 58.0.1 | Yes: npm 2026-10-29; its version number follows the SDK (58.x) | Expo Modules package, versioned for SDK 58. The README text I read does not say "New Architecture"; `npx expo install --check` and a build confirm (task 3). | npm 0.55 MB unpacked | Depends on the phone's recognizer. `getSupportedLocales()` lists installed on-device packs. Hindi (`hi-IN`) and Kannada (`kn-IN`) support on the Reference phone is **unverified**. | MIT | **No.** | [github.com/jamsch/expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition) |
| `@react-native-voice/voice` 3.2.4 | Slower: last npm update 2026-01-31 | Not stated; classic bridge module | small | Same dependence on the phone | MIT | No | `npm view @react-native-voice/voice` |

**Approved by the owner (D-046): `expo-speech-recognition`.** Android notes from its README: on-device recognition needs Android 13+ and an installed language pack; continuous mode and some options need Android 13+; `requiresOnDeviceRecognition: false` lets Android use its default service, which may send audio to a network service. The app therefore requests on-device when the pack exists and discloses otherwise (D-042, R2.2). It adds `RECORD_AUDIO`, which the `blockedPermissions` list (D-038) must not block for this package: task 3 checks `app.json`. The reference phone runs Android 14, so on-device recognition is possible if the Hindi or English pack is installed (unverified).

### Local Kotlin module `modules/overlaykit-llm` (lane K)

Pattern: the same as `modules/overlaykit-ocr` (D-036): `expo-module.config.json`, `package.json`, `index.ts`, `android/build.gradle`, a Kotlin `Module` class. Expo autolinking finds it in `modules/`. It works with the New Architecture because it uses the Expo Modules API, not a legacy bridge or a codegen spec. Android only. It adds no JavaScript package.

JS surface (`modules/overlaykit-llm/index.ts`), strings and numbers only:

```ts
export type LlmLoadResult = { ok: true } | { ok: false; code: 'NO_FILE' | 'OUT_OF_MEMORY' | 'UNSUPPORTED' | 'FAILED' };
export type LlmGenerateResult = { ok: true; text: string } | { ok: false; code: 'CANCELLED' | 'NOT_LOADED' | 'FAILED' };
load(modelPath: string, options: { backend: 'cpu' | 'gpu'; maxTokens: number }): Promise<LlmLoadResult>;
generate(requestId: string, system: string, user: string, schemaJson: string | null, maxOutputTokens: number): Promise<LlmGenerateResult>;
cancel(requestId: string): void;
release(): Promise<void>;
```

Kotlin rules (from Google's Android guide for the API):
- One single-thread executor owns the `Engine` and every `Conversation`. `initialize()` runs on it, never on the main thread (it can take seconds).
- `generate` creates a fresh `Conversation`, sends one message, collects the reply, then closes the conversation. `temperature` 0 and `topK` 1 for repeatable output. Thinking off, tools off, speculative decoding off.
- `cancel` calls `cancelProcess()` and waits for the reply to end. Close the conversation first, then the engine, each once. A second `close` throws.
- `cacheDir` is `context.cacheDir` (faster second load). The model file is outside the APK, at an absolute path.
- All Kotlin exceptions (`LiteRtLmJniException`, `IllegalStateException`, out-of-memory) become a code string. Nothing is thrown to JavaScript. `planner/adapters/litert.ts` maps the codes to `PL_*`: `NO_FILE` to `PL_NO_MODEL`, `OUT_OF_MEMORY` and `UNSUPPORTED` to `PL_UNSUPPORTED_DEVICE`, `CANCELLED` to no error (user cancel) or `PL_TIMEOUT`, `FAILED` to `PL_BAD_OUTPUT` or `PL_UNSUPPORTED_DEVICE` by phase.
- The module sends no data anywhere. LiteRT-LM's source docs mention no telemetry; task 3.2 re-checks with a network trace in airplane mode (DT-G5-04).

Gradle and build (all through the module's own files and `app.json` config, never by editing generated `android/`):
- Dependency `com.google.ai.edge.litertlm:litertlm-android:<pinned>` in the module's `build.gradle`. Candidate pins: 0.16.1 (Kotlin 2.2 compatible), or 0.18.1 and later (need Kotlin 2.3+). **Open:** which Kotlin version the Expo SDK 58 build resolves is not in the files I could read (the React Native catalog lists 2.2.0). Task 3.3 reads it from a real prebuild and picks the pin. Raising Kotlin is done with a config plugin that sets `android.kotlinVersion` in `gradle.properties` (Expo's own build reads it); this needs no new package, but it affects every native module and is a lane X change with its own check.
- `minSdk`: 24 for both React Native and the AAR. No change.
- GPU backend is optional and off by default (CPU first). If turned on, the module's `AndroidManifest.xml` adds the two `uses-native-library` entries (`libvndksupport.so`, `libOpenCL.so`, both `required="false"`). No new permission.
- ABI: the phone is `arm64-v8a`. APK size impact of the native libraries is unmeasured (`reactNativeArchitectures` currently lists four ABIs). Task 3.3 records the release APK size.
- `INTERNET` is already allowed (D-038). `model-store` does not use it: there is no model download (D-048).

Model file placement:
- No in-app download (D-048). The owner pushes the file; `model-store` checks size and SHA-256 and never deletes it.
- Owner `adb push`, debug build: `adb push gemma3-1b-it-int4.litertlm /data/local/tmp/` then `adb shell run-as <package> cp /data/local/tmp/gemma3-1b-it-int4.litertlm files/` (works for debuggable builds only). The file then sits at `<app files dir>/gemma3-1b-it-int4.litertlm`, which is the path `model-store` checks. Delete `/data/local/tmp` copy afterwards. A release build cannot use `run-as`; the alternative is the app-specific external folder, which may be blocked for `adb` on Android 14 or HyperOS. Task 5.3 tests which route works and writes it down. This is a device-only check.

## Data Models

| Name | Where | Fields |
| --- | --- | --- |
| `Goal` | `ui` state | `text`, `source: 'tap' \| 'voice'`, `lineId?` |
| `Expectation` | `shared` or `guide/plan` | `'manual'` or `{ appear: string[], disappear: string[] }` (normalized) |
| `GroundedStep` | `guide/plan` | `id`, `instruction`, `action`, `enterHint`, `target { lineId, quad, frameId }`, `expectation` |
| `PlanGuideState` | `guide/plan` | `status`, `goal`, `done[]`, `step`, `streak[]`, `notSeenCount`, `lastSeq`, `notBeforeSeq`, `acceptedObservationIds[]`, `acceptedFrameIds[]`, `proofs[]`, `error` |
| `PlannerState` | `planner` | `{ kind: 'missing' } \| { kind: 'ready' } \| { kind: 'loading' } \| { kind: 'failed', code }` |

## Error handling

| Code | Module | Cause | UI text | Actions |
| --- | --- | --- | --- | --- |
| `PL_NO_MODEL` | planner | Model file missing or failed its check | "The planner file isn't on this phone. Setup steps are in Settings (about 584 MB)." | Show setup steps; Translate; Explore |
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

New rows in `docs/DEVICE-TESTS.md`, all NOT TESTED until run: DT-G5-01 (three real machines, tap goal), DT-G5-02 (advance on camera and on Done, 60 s idle), DT-G5-03 (ungrounded plan), DT-G5-04 (airplane mode planning, no network), DT-G5-05 (voice en and hi), DT-G5-06 (pushed file missing, wrong size, wrong checksum: each shows `PL_NO_MODEL`), DT-G5-07 (release build speed, memory, battery), DT-G5-08 (backgrounding and screen loss), DT-ERR-PL (each PL and SP state).

## Open Questions

See `requirements.md` OQ-1 to OQ-8. Design-only points:

- **DQ-1.** File checksum without a new package. `expo-file-system` may or may not offer a hash in SDK 58; task 5.3 checks. If it does not, the owner chooses between a size check plus a `.litertlm` header check, or approving a hashing package. The Kotlin module could also hash the file with the JDK (`MessageDigest`), which needs no package: preferred if `expo-file-system` has no hash.
- **DQ-2.** Backend (CPU or GPU), `maxNumTokens` (context size) and output-token cap for the Reference phone. Set in task 14 from measurements. Default: CPU.
- **DQ-3.** Hindi OCR lines in the prompt: whether to send Devanagari as read, or transliterate. Default: as read.
- **DQ-4.** Which `litertlm-android` version and which Kotlin version the Expo SDK 58 build uses (see "Local Kotlin module"). Decided by task 3.3 from a real prebuild.
- **DQ-5.** Whether the pinned version has `ResponseFormat.json` and whether it is reliable on the phone. Decided by task 12.1 and measured in task 14.

## Flagged items for the owner

1. Decided (D-048): Gemma 3 1B int4 (584 MB, gated, Gemma terms), pushed by you with `adb push`; Gemma 4 E2B is the documented fallback only. `expo-speech-recognition` is already approved (D-046).
2. You log in to Hugging Face, accept the terms, download the file and push it (task 1.4). No token goes to the app or to any worker. The app is sideload-only for this file.
3. LiteRT-LM has no npm package. We write a Kotlin module. Kotlin 2.2 versus 2.3+ is an open build risk (DQ-4).
4. Speech may send audio to Google's service unless an on-device pack exists. The app discloses this before first use (D-046).
5. About 1 GB peak memory for the 1B (Google's number on another phone) is unproven on the 5.67 GB phone, and the 1B may be too weak at JSON and Hindi. Task 14 measures both.
6. Plans are AI suggestions and can be wrong. Demo and Devpost text must say so.
7. Gate G4 and spec 03 tasks tied to TM-01 are replaced (D-043).

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
