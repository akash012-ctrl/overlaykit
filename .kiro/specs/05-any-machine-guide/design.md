# Design Document: any-machine-guide

Status: **draft, revised 2026-11-19 for the Gemma route and again for two selectable planners (D-049, D-050).** The sections "Two planners" and "Gemini Live adapter" below are new. Where an older sentence below says the model is Gemma 3 1B, sideload only, or that no network code exists under `planner`, the new sections and D-049 win. Implements `requirements.md` under D-039 to D-043 and D-045 to D-048 (owner chose Google on-device AI with Gemma, approved `expo-speech-recognition`, and chose Gemma 3 1B IT int4, sideload only). No code is written by this document. The runtime is our own Kotlin Expo Module around LiteRT-LM. The default on-device model is **Gemma 4 E2B**, downloaded on the user's tap (D-049). **Gemma 3 1B IT int4**, pushed by the owner, is the small fallback (D-048). The user can choose **Gemini Live** (cloud, opt-in, D-050). Evidence and links: `.scratch/reports/spec-05-gemma-redesign.md`.

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
| DD-10 | Two adapters sit behind one `StepPlanner`: `litert` (on-device, default) and `gemini-live` (cloud, opt-in). `ui` picks one from the saved Planner_Choice. | Grounding, expectation and the reducer must behave the same for both, so Guide has one logic and two sources of suggestions. |
| DD-11 | Gemini Live returns steps through a **function call**, not free text and not coordinates. The adapter checks the arguments with the same strict parser and `guide/plan` grounds the target text on local OCR. | The Live model cannot give structured output (model page: "Structured outputs: not supported") but does support function calling. Local OCR stays the only source of positions. |
| DD-12 | The Live adapter sends the same still that OCR read, with its OCR lines as text and the frame id. | The answer is tied to one OcrResult, so the quad comes from that frame (R16.7). |
| DD-13 | Microphone PCM capture and JPEG scaling live in a local Kotlin module `modules/overlaykit-live`, not in an npm audio package. | No new npm audio dependency with unproven RN 0.88 support. Same pattern as D-036 and D-045. |

## Architecture

### Module map

```
app (src/app) -> ui
ui       -> guide, planner, speech, geometry, ocr, capture, locale, shared   (ui wires capture frames and the mic into the Live adapter through ports)
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
  adapters/gemini-live.ts              (lane L; Gemini Live adapter; only file importing `modules/overlaykit-live`)
  live/protocol.ts  live/session.ts  live/manifest.ts   (lane L; pure messages, socket helper, constants)
  live-key-store.ts                    (lane L; only file importing `expo-secure-store`)
src/modules/speech/
  index.ts                             (SpeechInput API)
  types.ts
  adapters/android-recognizer.ts       (only file importing the speech package)
src/modules/guide/plan/
  types.ts  ground.ts  expectation.ts  reducer.ts  constants.ts  index.ts
src/modules/ui/guide/
  (existing files stay; new:) GoalPicker.tsx, VoiceGoal.tsx, PlanningView.tsx,
  ModelGate.tsx, CannotPlanView.tsx, FinishPrompt.tsx, usePlanGuide.ts, plan-view-model.ts,
  PlannerSettings.tsx, LiveConsentScreen.tsx, LiveKeyScreen.tsx, LiveBanner.tsx, LiveStartButton.tsx, live-view-model.ts   (lane U)
  (changed:) StepCard.tsx (AI label), error-map.ts (PL_*, SP_* rows), GuideScreen.tsx (new flow)
src/modules/locale/strings/{en,hi,kn}.ts  (append keys, ui lane only)
modules/overlaykit-live/               (lane K2: local Kotlin Expo Module: microphone PCM and JPEG scaling, see "Android audio and JPEG")
modules/overlaykit-llm/                (lane K: local Kotlin Expo Module around LiteRT-LM, also downloads the model file, see "Local Kotlin module")
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
  'PL_LIVE_NO_KEY', 'PL_LIVE_AUTH', 'PL_LIVE_QUOTA', 'PL_LIVE_NETWORK',
  'PL_LIVE_SESSION_ENDED', 'PL_LIVE_MIC_DENIED',
] as const;
export type PlannerChoice = 'on-device' | 'gemini-live';       // default 'on-device'
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

## Two planners (D-049, D-050)

The user picks the planner in Settings. Both implement `StepPlanner`, so `guide/plan` (grounding, expectation, reducer) is identical for both.

```
Settings: plannerChoice = 'on-device' (default) | 'gemini-live'
                |
   ui (usePlanGuide) picks the adapter
        |-- on-device: createStepPlanner()          -> litert adapter (Gemma 4 E2B, fallback Gemma 3 1B)
        '-- gemini-live: createLiveStepPlanner()    -> gemini-live adapter (WebSocket to Google)
                                  both return PlannerOutput -> groundStep(output, ocr) -> planReducer
```

**Choice, not a router.** A `PlannerRouter` class is not needed. `ui` holds `plannerChoice` and calls one of two factories. `planner/index.ts` exports `createStepPlanner` (unchanged) and `createLiveStepPlanner`. *shortcut: no automatic failover; `ui` shows the error and the user chooses. Revisit only if the owner wants "try on-device when Live fails".*

**Settings and key storage.**
- `plannerChoice` and `liveConsent: { version: number } | null` are two fields appended to the small settings store in `locale` (`settings-store.ts`), by lane U, append-only. Default `on-device`, `null`. The type `PlannerChoice` is in `shared` (lane S).
- The Google key is not in that store. `planner/live-key-store.ts` is the only file that imports `expo-secure-store` (`getItemAsync`, `setItemAsync`, `deleteItemAsync`) and returns `Result` values. The key is shown masked (last four characters).

**Frames reach the Live adapter through a port, so `PlanRequest` stays image-free.**

```ts
// planner/adapters/gemini-live.ts
export interface LiveFrameSource {
  /** JPEG, long edge <= 768 px, base64, for the still OCR read as `frameId`. null when it is gone. */
  frameJpegBase64(frameId: FrameId): Promise<string | null>;
}
export interface LiveMicSource {            // optional; the mic toggle is off by default
  start(onChunk: (pcm16kBase64: string) => void): Promise<Result<void, 'PL_LIVE_MIC_DENIED'>>;
  stop(): void;
}
export type LiveSessionState =
  | { kind: 'off' } | { kind: 'connecting' } | { kind: 'open'; micOn: boolean }
  | { kind: 'ended'; code: PlErrorCode | null };
export interface LiveStepPlanner extends StepPlanner {
  startSession(): Promise<Result<void, PlErrorCode>>;   // needs a saved key and stored consent, else PL_LIVE_NO_KEY / refuses
  stopSession(): void;                                  // idempotent, works while connecting
  sessionState(): LiveSessionState;
  subscribeSession(cb: (s: LiveSessionState) => void): () => void;
  setMic(on: boolean): Promise<Result<void, PlErrorCode>>;
}
export function createLiveStepPlanner(opts: { frames: LiveFrameSource; mic?: LiveMicSource; keyStore: LiveKeyStore }): LiveStepPlanner;
```

`ui` supplies `frames` from `capture` (the stored still for that frame id, scaled by the Kotlin module) and `mic` from the module. `planner` never imports `capture`. `StepPlanner.status()` for Live returns `ready` when a key is saved, else `missing`.

### Gemini Live adapter (lane L)

Files, all in `src/modules/planner/`:

```
adapters/gemini-live.ts            createLiveStepPlanner; implements LiveStepPlanner; the only file importing modules/overlaykit-live (mic, JPEG scale)
live/protocol.ts                   pure: buildSetup(), buildFrameMsg(), buildTextMsg(), buildAudioMsg(), buildToolResponse(), parseServerMessage()
live/session.ts                    live session helper: owns the WebSocket, resumption handle, GoAway, timers; no vendor types leave it
live/manifest.ts                   LIVE_MODEL_ID = 'gemini-3.8-live', endpoint host, constants (unset ones are NaN)
live-key-store.ts                  the only importer of expo-secure-store
```

`live/protocol.ts` is pure, so it can be reviewed and tested with fixed JSON. `live/session.ts` uses React Native's built-in `WebSocket` (no package).

**Transport.** WSS to `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=<user key>` (Google's raw WebSocket guide). The first message is a `setup`. Then JSON messages: `realtimeInput.video` (JPEG, base64), `realtimeInput.audio` (`audio/pcm;rate=16000`, base64, 20 to 100 ms chunks), `realtimeInput.text`, and `toolResponse`. Server messages carry `serverContent` (transcription, `turnComplete`), `toolCall`, `sessionResumptionUpdate`, `goAway`. The key is in the URL, so `session.ts` never logs or throws the URL.

**Setup message content** (field names from Google's pages; the exact nesting of `responseModalities` differs between the guide's flat sample and the API reference, so task 19.1 checks the API reference before coding):
- `model`: `models/gemini-3.8-live`. Response modality `AUDIO` (the only one this model supports). `outputAudioTranscription: {}` for captions. No input transcription (no transcript of the user is kept).
- `contextWindowCompression: { slidingWindow: {} }` and `sessionResumption: {}`.
- `tools`: three function declarations: `show_step`, `goal_finished`, `cannot_plan`.
- `systemInstruction`: fixed text: you are a step guide; each message has a frame id, the goal, done steps and the numbered lines the camera read; reply by calling exactly one function; `targetText` must be copied exactly from one listed line; never give coordinates; never repeat personal data; if unsure call `cannot_plan`; say at most one short sentence out loud.
- Do not send `thinkingLevel` (not supported on `gemini-3.8-live`), `enable_affective_dialog` or `proactivity` (removed on 3.8).

**Function declarations (the return shape).**

```ts
show_step({
  frameId: string,          // echo of the frame the answer is about
  instruction: string,      // English, one short sentence
  action: 'press' | 'enter' | 'read' | 'wait',
  targetText: string,       // copied exactly from one listed line
  enterHint: string | null, // what kind of value, never a value
  appear: string[], disappear: string[],
})
goal_finished({ frameId: string })
cannot_plan({ frameId: string, reason: string })
```

The adapter maps these to `PlannerOutput` (`step`, `finished`, `cannot-plan`), runs the same strict checks as `parseOutput` (unknown fields, wrong types, empty target for `press` fail with `PL_BAD_OUTPUT`), and replies with a `toolResponse` carrying the call `id` and `{ status, retryable, message }` (Google requires structured responses on 3.8; an empty response makes the model repeat calls). Only then does `guide/plan` run `groundStep`: `targetText` must normalize-equal exactly one line of that frame's OcrResult, else `PL_TARGET_NOT_FOUND`. Positions always come from OCR quads through `geometry`. A model-supplied number is never read.

**One step per call.** `planNext(req, signal)` sends the frame (video message) and one text message with the frame id, goal, done steps and the numbered lines, then waits for the next tool call. A new `planNext` while one is pending cancels the first. `signal` abort or `LIVE_PLAN_TIMEOUT_MS` (unset) returns `PL_TIMEOUT`. The adapter does not stream frames continuously in v1: it sends a frame when `ui` asks for a plan, and while watching for the next change `ui` sends new frames at `LIVE_FRAME_INTERVAL_MS` (at least 1000 ms). *shortcut: frame-on-demand keeps video tokens and cost low; continuous watching and the model's own turn-taking are a later option.*

**Session limits and cost control.**
- Without compression, audio plus video sessions end at about 2 minutes (128k token window); a connection lasts about 10 minutes; a `GoAway` message arrives about 60 seconds before. The adapter turns on sliding-window compression and session resumption (handle valid 2 hours) and reconnects on `GoAway`. A failed resume ends the session with `PL_LIVE_SESSION_ENDED`; the user taps Start again.
- Video turn coverage defaults to all video on 3.8, so frames sent count as tokens. Sending on demand and at no more than 1 per second keeps it small.
- Audio replies cost money too (about US$0.018 per minute of model audio). The system instruction asks for one short sentence. The app drops the audio bytes (OQ-9).

**Errors.** Close codes and error payloads map to `PL_LIVE_AUTH` (key rejected, API not enabled), `PL_LIVE_QUOTA` (quota or billing), `PL_LIVE_NETWORK` (socket error, offline), `PL_LIVE_SESSION_ENDED` (server closed, resume failed), `PL_LIVE_MIC_DENIED`. The exact close codes are not in the pages read; task 19.1 records what the server sends on a wrong key and on quota, from a real call with the owner's key. Unknown closes map to `PL_LIVE_NETWORK`.

### Android audio and JPEG: `modules/overlaykit-live` (lane K2)

A second local Kotlin Expo Module, same pattern as `modules/overlaykit-ocr` and `modules/overlaykit-llm`. No npm package.

```ts
startMic(onChunk): Promise<{ ok: true } | { ok: false; code: 'DENIED' | 'FAILED' }>   // AudioRecord, 16 kHz mono 16-bit PCM, ~50 ms chunks, base64
stopMic(): void
scaleJpegBase64(stillUri: string, maxLongEdge: number, quality: number): Promise<{ ok: true; base64: string } | { ok: false; code: 'NO_FILE' | 'FAILED' }>
```

`startMic` runs only after the user turned the mic on in a Live_Session, and `stopMic` is called by Stop, backgrounding and leaving Guide. The module writes nothing to disk. `RECORD_AUDIO` is already allowed (D-046). The camera config keeps `recordAudioAndroid: false`.

### Privacy flow in `ui` (lane U)

```
Settings > Planner > "Gemini Live (Google, cloud)"
  no key?      -> Key screen (paste key, masked, remove)         [expo-secure-store]
  no consent?  -> Consent screen (names Google, what is sent)     [Agree and turn on | No, keep on-device]
  both ok      -> plannerChoice = 'gemini-live'
Guide with gemini-live
  Goal picked -> "Start Gemini Live" button  (every session)
  tap         -> Live_Banner shown FIRST ("Streaming to Google", red dot, Stop, mic toggle), then startSession()
  banner is the send gate: LiveFrameSource and LiveMicSource calls are refused unless banner state is connecting|open
  Stop / background / leave Guide / goal done / error -> stopSession(), banner hidden, camera feed to the planner stops
```

The banner reads `sessionState()`, not a UI flag, so it shows exactly while a socket exists. On any `ended` state, `ui` shows the matching `PL_LIVE_*` view with "Use on-device planner" and "Try again".

### Gemma 4 E2B in-app download (lane M and lane K)

- `planner/model-manifest.ts` holds two entries: `gemma-4-e2b` (default) and `gemma-3-1b` (fallback). Fields: file name, size, SHA-256, URL (for Gemma 4 only), licence, `gated`.
- Gemma 4 E2B URL: `https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm`. Size 2,588,147,712. SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`. Re-read both from the Hugging Face API at task 5.6 before pinning.
- The download runs in `modules/overlaykit-llm` (lane K) so a 2.6 GB transfer does not go through JavaScript: `downloadModel(url, destPath, expectedSize, expectedSha256)` with HTTP Range resume, progress events, cancel, and a temporary file `<name>.part` renamed after the SHA-256 matches. `expo-file-system` has no resumable download with progress for this size that I could confirm, so no JS download is proposed. Needs free space of at least the file size plus a margin; the check happens before the first byte.
- `model-store.ts` (lane M) chooses: Gemma 4 E2B if its file passes the check, else Gemma 3 1B if pushed and valid, else `PL_NO_MODEL` with a Download button. State `downloading` carries `receivedBytes` and `totalBytes`.
- The download host and path send no user data. The request carries no token. Android 14 and the app's `INTERNET` permission are enough.
- If Gemma 4 E2B fails to load for memory (`OUT_OF_MEMORY`), the adapter tries Gemma 3 1B when present, else returns `PL_UNSUPPORTED_DEVICE`.
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
| **Gemma 4 E2B (default, D-049)** | `gemma-4-E2B-it.litertlm`, 2,588,147,712 bytes (2.59 GB), SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`, repo [`litert-community/gemma-4-E2B-it-litert-lm`](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) | **Apache-2.0, not gated** (`gated: false`). No account or token needed. | Galaxy S26 Ultra, CPU: about 47 tokens/s decode, time to first token 1.8 s, 1,733 MB peak CPU memory. GPU: 0.3 s, 676 MB. | 2.3B effective parameters. 140+ languages claimed; Hindi and Kannada planning quality is unmeasured. Text, image and audio inputs exist but are not used. Mixed 2, 4 and 8-bit weights. The newest and largest of the three. On a 5.67 GB phone, 1.7 GB peak plus the app is plausible but not proven. |
| Gemma 3 1B IT, int4 (small fallback, D-048) | `gemma3-1b-it-int4.litertlm`, 584,417,280 bytes (584 MB), SHA-256 `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`, repo [`litert-community/Gemma3-1B-IT`](https://huggingface.co/litert-community/Gemma3-1B-IT) | Gemma Terms of Use. **Gated** (`gated: auto`): needs a Hugging Face login and a click on "Acknowledge licence". | Galaxy S24 Ultra, CPU, int4: about 55 tokens/s decode, about 1,009 MB peak. GPU: about 1,205 MB. | Text only. Smallest and fastest. Likely weaker at following a JSON shape and at Hindi; unmeasured. Kept as the small fallback for a phone that cannot hold Gemma 4 E2B. Sideload only. |
| Gemma 3n E2B (not recommended) | `gemma-3n-E2B-it-int4.litertlm`, 3,655,827,456 bytes (3.66 GB), repo [`google/gemma-3n-E2B-it-litert-lm`](https://huggingface.co/google/gemma-3n-E2B-it-litert-lm) | Gemma Terms of Use. **Gated, manual** approval (`gated: manual`). | S24 Ultra, CPU: about 16 tokens/s decode. | Larger, slower, older than Gemma 4 E2B, and needs manual approval. |

**Hosting and gate (D-049, replaces D-048 for the default).** Gemma 4 E2B is public and Apache-2.0 (`gated: false`), so the app downloads it itself on the user's tap (see "Gemma 4 E2B in-app download"). Gemma 3 1B IT is gated: the owner logs in to Hugging Face, accepts the terms, downloads it and runs `adb push`. The app never holds a token, never offers the gated file for download, and never puts any model in an APK or on a link we publish. Only the Gemma 3 file brings the Gemma Terms notice duties (D-047).

**Languages.** Hindi and Kannada are inside the "140+ languages" claim for Gemma 4 and Gemma 3. I found no per-language benchmark for either on these edge models. DD-3 keeps step text in English and translates it with `locale`, so the planner only has to read English or Hindi OCR lines. Task 14 measures Hindi; Kannada stays "unmeasured".

**Performance expectation.** The reference phone (mid-range, 5.67 GB) is slower than the S24 and S26 Ultra phones in Google's tables. Expect several times slower decode and a slow first load. No number is promised. A step is about 80 to 150 output tokens, so a step may take several seconds to tens of seconds. Task 14 measures it on a release build.

### Constrained output (DD-2)

- LiteRT-LM supports constrained decoding with LLGuidance: regex, JSON Schema or Lark grammar ([constrained-decoding doc](https://github.com/google-ai-edge/LiteRT-LM/blob/main/docs/api/cpp/constrained-decoding.md); that doc shows the C++ API).
- The Kotlin API exposes it as `ConversationConfig(enableResponseFormat = true)` and `sendMessageAsync(text, responseFormat = ResponseFormat.json(schema))`. I saw this only in a user's bug report on 0.17.0 ([issue 3944](https://github.com/google-ai-edge/LiteRT-LM/issues/3944)), not on a Google doc page. Task 12.1 confirms the exact names in the pinned version before any code depends on them.
- The same report found: with speculative decoding off, 56 of 60 calls returned valid JSON and 4 timed out. With speculative decoding on, no call was usable. Therefore the module keeps speculative decoding off (DD-9). The report also lists related open issues for thinking mode and for tools combined with a response format, so the module uses neither.
- If the pinned version has no usable response format, the fallback is the current design: ask for JSON in the prompt, parse strictly, return `PL_BAD_OUTPUT` on any mismatch, and allow one "Try again" (R6.2). Grounding stays the last check in both cases.

### Gemini Live packages (not installed; owner approval needed, D-050)

Checked 2026-11-19. App versions: Expo `~58.0.26`, React Native `0.88.1`, New Architecture on.

| Item | Proposed? | Why | SDK 58 / RN 0.88 evidence |
| --- | --- | --- | --- |
| `expo-secure-store` | **Yes, owner must approve.** Gate task: Gemini Live key (spec 05 task 3.4). | Keystore-backed storage for the user's Google key. | [Expo SecureStore docs](https://docs.expo.dev/versions/latest/sdk/securestore/): reference v58.0.0, source `sdk-58`, "Recommended version: ~58.0.3", Android values stored in SharedPreferences encrypted with the Android Keystore. npm dist-tag `latest` is 58.0.3 (`npm view`, 2026-11-19). Expo Modules package, so no extra New Architecture step. Install with `npx expo install expo-secure-store`. |
| WebSocket client | **No package.** | React Native has a global `WebSocket`. Google documents plain JSON over WSS. | Built into React Native. Binary frames are not needed (JSON with base64). |
| Microphone PCM and JPEG scale | **No npm package.** Local Kotlin module `modules/overlaykit-live` (lane K2). | Raw 16 kHz PCM chunks and a scaled JPEG. | Same pattern as `modules/overlaykit-ocr` and `modules/overlaykit-llm`. |
| `@google/genai` (JS SDK) | **No.** | Written for Node and browsers; the Live client needs ephemeral-token or key setup and extra weight. Hermes behavior is not documented in the pages I read. Our message set is about six JSON shapes. | Not verified on RN 0.88. Revisit only if our client proves hard to keep in step with the API. |
| Firebase AI Logic (Android Kotlin SDK) | **No.** | Official, but it needs a Firebase project, `google-services.json` and App Check (enforcement required from 2026-11-02 per its limits page), and it uses the project's Firebase config rather than the user's own key. Live is Preview there. Its Live model list on the page I read shows `gemini-3.1-flash-live-preview` for 3.x, not `gemini-3.8-live`. | [Firebase AI Logic Live API](https://firebase.google.com/docs/ai-logic/live-api?api=dev). |
| `react-native-audio-api` 1.0.1 (MIT) | **No (alternative).** | It has a microphone data callback. Its pages do not state support for RN 0.88 or SDK 58, and it adds a foreground-service permission. | [docs](https://docs.swmansion.com/react-native-audio-api/docs/inputs/audio-recorder/). Peer dependencies are `*`, which is not evidence. |

Existing packages reused: `expo-camera` (stills), `expo-speech-recognition` (voice goal, not used while a Live_Session holds the microphone).
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
| `PL_LIVE_NO_KEY` | planner | Gemini Live chosen but no key saved | "Add your Google API key in Settings to use Gemini Live." | Open key screen; Use on-device |
| `PL_LIVE_AUTH` | planner | Google rejected the key, or the API is not enabled | "Google didn't accept the key." | Check key; Use on-device |
| `PL_LIVE_QUOTA` | planner | Quota or billing limit | "Your Google quota is used up." | Use on-device |
| `PL_LIVE_NETWORK` | planner | Offline or socket error | "No connection to Google. Streaming stopped." | Try again; Use on-device |
| `PL_LIVE_SESSION_ENDED` | planner | Server closed the session, resume failed | "The Gemini Live session ended. Streaming stopped." | Start again; Use on-device |
| `PL_LIVE_MIC_DENIED` | planner | Microphone permission denied | "Microphone is off. Gemini Live can still watch the camera." | Continue without mic; Open Settings || `GD_MACHINE_LOST` | guide | Scene lost | "I lost the screen. Point the camera at it again." | Resume; Stop |
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

### Device tests (Gemini Live rows: DT-G5-09 no Google connection with Live off or declined, DT-G5-10 banner, Stop, background and no stored frame/audio/key, DT-G5-11 real goal, bad key, airplane mode, DT-G5-12 Gemma 4 E2B download progress/cancel/resume/hash/space)

New rows in `docs/DEVICE-TESTS.md`, all NOT TESTED until run: DT-G5-01 (three real machines, tap goal), DT-G5-02 (advance on camera and on Done, 60 s idle), DT-G5-03 (ungrounded plan), DT-G5-04 (airplane mode planning, no network), DT-G5-05 (voice en and hi), DT-G5-06 (pushed file missing, wrong size, wrong checksum: each shows `PL_NO_MODEL`), DT-G5-07 (release build speed, memory, battery), DT-G5-08 (backgrounding and screen loss), DT-ERR-PL (each PL and SP state).

## Open Questions

See `requirements.md` OQ-1 to OQ-12. Design-only points:

- **DQ-6.** Exact `setup` nesting for the Live API (`generationConfig.responseModalities` or a flat field), the close codes for a wrong key and for quota, and whether `realtimeInput.text` makes the model call a function reliably. Task 19.1 checks the API reference and one real call with the owner's key.
- **DQ-7.** Frame source for Live: `expo-camera` stills at 1 per second may be slow or make a shutter sound on Android. Task 20.2 measures it. If it fails, the frame feed comes from a lighter capture path in the `capture` module (a separate owner decision).
- **DQ-8.** Resumable 2.6 GB download in the Kotlin module versus JS: task 5.6 decides after reading what `expo-file-system` offers in SDK 58.

- **DQ-1.** File checksum without a new package. `expo-file-system` may or may not offer a hash in SDK 58; task 5.3 checks. If it does not, the owner chooses between a size check plus a `.litertlm` header check, or approving a hashing package. The Kotlin module could also hash the file with the JDK (`MessageDigest`), which needs no package: preferred if `expo-file-system` has no hash.
- **DQ-2.** Backend (CPU or GPU), `maxNumTokens` (context size) and output-token cap for the Reference phone. Set in task 14 from measurements. Default: CPU.
- **DQ-3.** Hindi OCR lines in the prompt: whether to send Devanagari as read, or transliterate. Default: as read.
- **DQ-4.** Which `litertlm-android` version and which Kotlin version the Expo SDK 58 build uses (see "Local Kotlin module"). Decided by task 3.3 from a real prebuild.
- **DQ-5.** Whether the pinned version has `ResponseFormat.json` and whether it is reliable on the phone. Decided by task 12.1 and measured in task 14.

## Flagged items for the owner

1. Decided (D-049): two planners. Default on-device Gemma 4 E2B (2.59 GB, Apache-2.0, public, in-app download on tap). Small fallback Gemma 3 1B (584 MB, gated, your db push). Opt-in cloud planner Gemini Live (D-050). xpo-speech-recognition is already approved (D-046).
2. You approve: xpo-secure-store (task 3.4), the Kotlin module modules/overlaykit-live (no npm package), the model id gemini-3.8-live, and that Gemini Live sends frames, audio, goal and OCR text to Google. You also provide a Google API key (a paid-tier key keeps content out of Google's product improvement). No key goes to any worker.
3. LiteRT-LM has no npm package. We write a Kotlin module. Kotlin 2.2 versus 2.3+ is an open build risk (DQ-4).
4. Speech may send audio to Google's service unless an on-device pack exists. The app discloses this before first use (D-046).
5. Gemma 4 E2B peak memory (1.7 GB on CPU on a Galaxy S26 Ultra, Google's number) is unproven on the 5.67 GB phone. The 1B fallback may be too weak at JSON and Hindi. Task 14 measures both.
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
| R10 | Module map, source searches, model-store and the Gemini Live adapter as the only network code (listed) |
| R11 | DD-3, locale |
| R13 | Module map, lint VENDOR_OWNERS |
| R15 | "Two planners", PlannerSettings |
| R16 | "Gemini Live adapter", "Privacy flow in `ui`", `modules/overlaykit-live` |
| R17 | `live-key-store.ts`, Gemini Live packages |
| R14 | Device tests, G5 |
