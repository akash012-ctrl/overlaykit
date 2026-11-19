# Implementation Plan: any-machine-guide

Status: **draft, revised 2026-11-19 for the Gemma route (D-045 to D-047) and for two selectable planners (D-049 Gemma 4 E2B default plus Gemma 3 1B fallback, D-050 Gemini Live opt-in).** Tasks 19 to 22 and the changes to tasks 1, 2, 3, 5, 8, 12 and 17 are new; they sit before the final checkpoint 18. Written from `requirements.md` and `design.md`. No task is started or complete. A task is checked off only after its done check ran and its output was recorded.

## Overview

Order:
1. Owner approvals (task 1): model, source of the model file, open questions. `expo-speech-recognition` is already approved (D-046).
2. Shared codes and plan types (task 2). Every lane depends on it.
3. In parallel after task 2: lane P (pure `guide/plan`), lane M (`planner`), lane K (Kotlin module `modules/overlaykit-llm`, task 12), lane V (`speech`), and, once the owner approves task 1.5, lane L (Gemini Live adapter, task 19) and lane K2 (Kotlin module `modules/overlaykit-live`, task 20). Lane U (`ui`) starts when P, M and V have their interfaces committed; it can code against the types before the adapters work.
4. Package install and native build (task 3), by the owner of `package.json` and `app.json`. Only `expo-speech-recognition` is installed. The LLM runtime is a Gradle dependency of our own module, not an npm package.
5. Device measurement (task 14), docs and gate (task 17), cleanup (task 16).

Done check for every task unless it says more: `npm run typecheck` and `npm run lint` exit 0, and `npx expo-doctor` at checkpoint tasks. `npm test` is not run (tests are deferred, owner decision 6). Report the commands run with exit codes, files changed, and device status.

Rules for every worker:
- Commit by explicit path (`git add <paths>`), never `git add -A`.
- Touch only the files your lane owns. Append-only edits to shared files are named per task.
- No package install, no change to `package.json` or `app.json`, except task 3.
- Never delete, skip or weaken an existing test. Test tasks are marked `*` and are optional.
- No device claim without a `docs/DEVICE-TESTS.md` record. With no phone: "device validation pending".

## File ownership

| Lane | Owns (may create and edit) | May only append to | Must not touch |
| --- | --- | --- | --- |
| 0 owner/coordinator | `docs/DECISIONS.md` entries, `docs/QUALITY-GATES.md`, `docs/ARCHITECTURE.md`, `docs/DEVICE-TESTS.md` rows (task 17) | none | code |
| S shared (tasks 2 and 2.2 only) | `src/modules/shared/index.ts` | n/a | all else |
| P pure | `src/modules/guide/plan/**` | `src/modules/guide/index.ts` | `planner/`, `speech/`, `ui/`, `locale/`, `components/`, old `guide/*.ts` |
| M planner | `src/modules/planner/**` **except** the lane L files below (includes `adapters/litert.ts`, `model-store.ts`, `model-manifest.ts`) | none | `guide/`, `ui/`, `speech/`, `modules/`, `package.json`, `app.json`, lane L files |
| L Gemini Live (new, D-050) | `src/modules/planner/adapters/gemini-live.ts`, `src/modules/planner/live/**`, `src/modules/planner/live-key-store.ts` | `src/modules/planner/index.ts` (export lines only) | `ui/`, `shared/`, `guide/`, `speech/`, `locale/`, `capture/`, other `planner/` files, `package.json`, `app.json`, `modules/` |
| K2 live native (new) | `modules/overlaykit-live/**` | none | all of `src/`, `modules/overlaykit-llm/`, `modules/overlaykit-ocr/`, `package.json`, `app.json`, generated `android/` |
| K Kotlin module | `modules/overlaykit-llm/**` (includes the model download, task 12.4) | none | all of `src/`, `package.json`, `app.json`, generated `android/` |
| V speech | `src/modules/speech/**` | none | `guide/`, `ui/`, `planner/`, `package.json`, `app.json` |
| U ui | `src/modules/ui/guide/**` (includes the Gemini Live consent, key, banner and start views, task 21) | `src/modules/locale/strings/{en,hi,kn}.ts` (append keys), `src/modules/locale/settings-store.ts` (append the two fields `plannerChoice` and `liveConsent`), `src/modules/ui/index.ts` | `guide/`, `planner/`, `speech/` internals (import through `index.ts` only) |
| X native config | `package.json`, `package-lock.json`, `app.json` (only `expo-secure-store` is new for Gemini Live), `eslint` `VENDOR_OWNERS` list, and any config plugin file for Kotlin version, GPU libraries or manifest (task 3.3) | none | all `src/` code |

## Tasks

- [ ] 1. Owner approvals
  - [x] 1.1 Confirm the model
    - Done in D-045 to D-047: Gemma route, LiteRT-LM runtime in a local Kotlin module, `expo-speech-recognition` approved. Model decided in D-049 (replaces D-048): Gemma 4 E2B is the default, downloaded in the app on tap; Gemma 3 1B IT int4 is the small sideload-only fallback. No new npm package is needed for the runtime.
    - _Requirements: OQ-1, OQ-5, R10.4_
  - [ ] 1.2 Owner answers OQ-3 to OQ-12
    - Record any change from the recommended defaults in `requirements.md` before lanes start.
  - [x] 1.3 Confirm the model source and who does what
    - Done in D-049: Gemma 4 E2B (default) is pinned at 2,588,147,712 bytes, SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`, public URL, in-app download (tasks 5.6, 12.4). Fallback Gemma 3 1B (D-048): 584,417,280 bytes and SHA-256 `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`, sideload only. Lane M uses them for `model-manifest.ts`. No authorised public mirror was found, so there is no download. The owner does the credentials steps in task 1.4.
  - [ ] 1.4 FALLBACK ONLY: owner steps to put Gemma 3 1B on the phone (credentials item for the owner; no worker does these; skip when Gemma 4 E2B downloads and loads)
    - 1. Log in to Hugging Face. 2. Open `https://huggingface.co/litert-community/Gemma3-1B-IT`, read and accept the Gemma terms. 3. Download `gemma3-1b-it-int4.litertlm`. 4. Check the SHA-256 on the PC: `Get-FileHash .\gemma3-1b-it-int4.litertlm -Algorithm SHA256` must print `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`. 5. Install the debug build (`npx expo run:android --device`). 6. `adb push .\gemma3-1b-it-int4.litertlm /data/local/tmp/`. 7. `adb shell run-as com.overlaykit.app cp /data/local/tmp/gemma3-1b-it-int4.litertlm files/`. 8. `adb shell rm /data/local/tmp/gemma3-1b-it-int4.litertlm`. The file is then at `/data/data/com.overlaykit.app/files/gemma3-1b-it-int4.litertlm`.
    - `run-as` works for debug builds only. Release builds need another route, tested in task 5.3. No token goes to the app, to a worker, or into git.
    - Done check: the owner says the file is there and the hash matched. Record the date. Until then: "device validation pending".
    - _Requirements: R4.2, R4.3_

  - [x] 1.5 Owner approves the Gemini Live design and its packages (D-050) - approved 2026-11-19, recorded in D-051 (items a to d; e and f stay at the design defaults)
    - Approve or change, in one reply: (a) `expo-secure-store` (task 3.4; SDK 58 source in `design.md`, "Gemini Live packages"); (b) the local Kotlin module `modules/overlaykit-live` (no npm package); (c) the model id `gemini-3.8-live` (it exists: Google's model page and pricing page list it as stable, read 2026-11-19); (d) that Gemini Live sends camera frames, microphone audio, the goal and the OCR text lines to Google, only after the consent screen and a "Start Gemini Live" tap; (e) the mic toggle default off (OQ-10); (f) no spoken reply in v1 (OQ-9).
    - Approved (D-051). Tasks 2.2, 3.4, 19, 20 and 21 are unblocked. Task 22 and the real call in 19.1 still wait for 1.6.
  - [ ] 1.6 Owner provides a Google API key (credentials item for the owner)
    - Owner approval given (D-051): the owner types the key into Settings on the phone later. Still open until the owner says it is saved.
    - The owner makes a Google API key in Google AI Studio and enters it on the phone in Settings. No worker sees it. It is not written in any file or command and is not committed. A paid-tier key keeps content out of Google's product improvement (pricing page); a free-tier key does not. Needed for task 19.1 (one real call) and task 22 only.
    - Done check: the owner says the key is saved on the phone.

- [ ] 2. Shared codes and plan types (lane S, first, small; 2.1 done, 2.2 new)
  - Files: `src/modules/shared/index.ts` (append only).
  - Add `PL_ERROR_CODES`, `PlErrorCode`, `SP_ERROR_CODES`, `SpErrorCode`, `PlanLine`, `PlanRequest`, `PlanAction`, `ProposedStep`, `PlannerOutput` exactly as in `design.md`. Do not edit existing codes.
  - Done check: typecheck and lint exit 0. `src/modules/shared/__tests__/error-codes.test.ts` keeps all existing rows; the owner-approved row additions (new `PL_*` and `SP_*`) are added only if the owner confirms (existing rule: add rows only).
  - _Requirements: 12.1, 13.1_
  - [x] 2.2 Append the Gemini Live codes and the choice type (lane S, tiny; needs 1.5)
    - Files: `src/modules/shared/index.ts` (append only). Add `PL_LIVE_NO_KEY`, `PL_LIVE_AUTH`, `PL_LIVE_QUOTA`, `PL_LIVE_NETWORK`, `PL_LIVE_SESSION_ENDED`, `PL_LIVE_MIC_DENIED` to `PL_ERROR_CODES`, and `export type PlannerChoice = 'on-device' | 'gemini-live'`. Existing rows of `error-codes.test.ts` stay. New rows come only under the owner's rows-only approval.
    - Done check: typecheck and lint exit 0.
    - _Requirements: 12.1, 15.1, 16.13_
- [ ] 3. Install the speech package and prove the native build (lane X; 3.1 needs no further approval, D-046)
  - [x] 3.1 Install `expo-speech-recognition`
    - `npx expo install expo-speech-recognition`. Then `npx expo install --check` and `npx expo-doctor`. Remove anything unused. No other package is installed in this spec.
    - Add the config plugin settings in `app.json` (microphone text). Make sure `RECORD_AUDIO` is not in `blockedPermissions` (D-038) and no other new permission appears. Keep `recordAudioAndroid: false` for the camera plugin.
    - Add `expo-speech-recognition` to `VENDOR_OWNERS` in the lint config, only in `speech/adapters/android-recognizer.ts`. Add `modules/overlaykit-llm` to `VENDOR_OWNERS`, only in `planner/adapters/litert.ts`.
    - _Requirements: 10.4, 13.5_
  - [ ] 3.2 Smoke build on the phone or report the blocker
    - `npx expo prebuild --clean`, then `npx expo run:android --device`. Prove: the app starts with the speech package and the (still empty) Kotlin module linked, and telemetry of every dependency is off.
    - No phone: report "device validation pending" and what ran (prebuild, Gradle assemble).
    - _Requirements: 4.6, 10.5_
  - [ ] 3.3 Decide the Kotlin version and the LiteRT-LM pin
    - After `npx expo prebuild --clean`, read which Kotlin version Gradle resolves. If it is 2.2.x, either pin `litertlm-android` 0.16.1 or raise Kotlin to 2.3+ with a small config plugin that sets `android.kotlinVersion` (no new package). Check Expo SDK 58 accepts that Kotlin version. Record the pin, the Kotlin version and the release APK size in the report. If neither works, report `question`.
    - Optional here, only if the owner approves `expo-build-properties`: `abiFilters` to `arm64-v8a`.
    - _Requirements: 4.5_

  - [x] 3.4 Install `expo-secure-store` (lane X; needs 1.5; D-050)
    - `npx expo install expo-secure-store`, then `npx expo install --check` and `npx expo-doctor`. Keep the plugin default `configureAndroidBackup: true`. Add `expo-secure-store` to `VENDOR_OWNERS`, only in `planner/live-key-store.ts`, and `modules/overlaykit-live` only in `planner/adapters/gemini-live.ts`. Run `npx expo prebuild --clean` and confirm `RECORD_AUDIO` is present and no other new permission appears.
    - SDK 58 source: Expo SecureStore docs (reference v58.0.0, recommended `~58.0.3`).
    - _Requirements: 13.5, 17.2_

- [x] 4. Lane P: pure Guide plan modules
  - [x] 4.1 Text normalization and grounding
    - Files: `src/modules/guide/plan/normalize.ts`, `ground.ts`, `types.ts`, `index.ts`.
    - `normalizeText`, `groundStep(output, ocr)`. Exact match to exactly one line, otherwise `PL_TARGET_NOT_FOUND`. Dropped: fuzzy matching.
    - Imports only `shared` and `geometry` types. No React.
    - _Requirements: 5.1, 5.2_
  - [x] 4.2 Expectation
    - Files: `guide/plan/expectation.ts`, `constants.ts`.
    - `buildExpectation`, `evaluateExpectation`, `sceneOverlap`. Named constants `SCENE_OVERLAP_MIN`, `SCENE_LOST_TIMEOUT_MS`, `GOAL_NOT_SEEN_LIMIT`, `MAX_STEPS_PER_GOAL` exist but are unset (`NaN`); unset means `cannot-tell` / never fires, as in spec 03.
    - _Requirements: 7.1, 7.2, 7.7, 8.4, 9.1_
  - [x] 4.3 Reducer
    - Files: `guide/plan/reducer.ts`, `guide/plan/types.ts`.
    - `planReducer` and `initialPlanGuideState`, adapted from `guide/reducer.ts` (copy, do not edit the old file). One `advance` function, one proof per advance. Events and states as in `design.md`.
    - _Requirements: 7.3 to 7.9, 8.1 to 8.3, 9.2, 9.3_
  - [x] 4.4 Public API
    - Append the exports to `src/modules/guide/index.ts` (append only).
  - [ ]* 4.5 Unit tests for 4.1 to 4.3
    - Optional, last. Files: `guide/plan/__tests__/*.test.ts`. Do not run until the owner asks.
  - [ ]* 4.6 Property tests for the reducer and grounding (P1 to P10, P12)
    - Optional, last. fast-check per D-035. Each file starts with `// Feature: any-machine-guide, Property <n>: <title>`.

- [ ] 5. Lane M: planner module
  - [x] 5.1 Interface and prompt
    - Files: `planner/index.ts`, `types.ts`, `prompt.ts`.
    - `StepPlanner`, `createStepPlanner`, `PlannerState`, `buildPrompt`. No network code, no vendor import.
    - _Requirements: 3.1, 3.2, 3.5, 13.1_
  - [x] 5.2 Output schema and strict parser
    - Files: `planner/schema.ts`.
    - JSON schema text and `parseOutput`. No repair of bad output. Works on constrained and unconstrained model text.
    - _Requirements: 3.8_
  - [x] 5.3 Model store
    - Files: `planner/model-store.ts`, `planner/model-manifest.ts`.
    - Locate the pushed file, check size and SHA-256, report `ready` or `missing` with `PL_NO_MODEL`. Never delete the owner's file (D-048). Written for the Gemma 3 file; task 5.6 (D-049) adds Gemma 4 E2B and the download state. Manifest holds file name, 584,417,280 bytes, and the SHA-256 from task 1.3. Hash with the Kotlin module (JDK `MessageDigest`) if `expo-file-system` has no hash (DQ-1). Also tests which path works for a release build (`run-as` is debug only) and writes it down.
    - _Requirements: 4.1 to 4.3, 10.1_
  - [x] 5.4 LiteRT adapter
    - Files: `planner/adapters/litert.ts`. Needs the typed JS surface from lane K (`design.md`, "Local Kotlin module"); can be coded against it before the native side builds, real calls blocked by task 12.
    - Load the model path from `model-store`, call `generate` with the prompt, the schema string and the output-token cap, call `cancel` on abort, `PL_TIMEOUT` after `PLAN_TIMEOUT_MS`, map module codes to `PL_*` (table in `design.md`), call `release()` on `release()`. The only file that imports `modules/overlaykit-llm`.
    - _Requirements: 3.3 to 3.6, 4.5_
  - [x] 5.6 Two-model manifest and in-app download state (lane M; D-049; needs 12.4 for real downloads)
    - Files: `planner/model-manifest.ts`, `planner/model-store.ts`, `planner/types.ts` (existing lane M files).
    - Manifest entries `gemma-4-e2b` (default, public URL, 2,588,147,712 bytes, SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`) and `gemma-3-1b` (fallback, no URL, 584,417,280 bytes, SHA-256 `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`). Re-read size and SHA-256 from the Hugging Face API before pinning and record the date.
    - Store order: valid Gemma 4 file, else valid Gemma 3 file, else `PL_NO_MODEL` with a download offer. The state `downloading` carries received and total bytes. A failed `.part` file is deleted by the app; a pushed file never is. `litert.ts` tries Gemma 3 when Gemma 4 returns `OUT_OF_MEMORY` and the 1B file is present.
    - Done check: typecheck and lint exit 0.
    - _Requirements: 4.1 to 4.5_
  - [ ]* 5.5 Unit tests for prompt and parser
    - Optional, last. Fixed strings only, no model.

- [ ] 6. Checkpoint: planner and pure modules
  - typecheck, lint, `npx expo-doctor`. Source search of `planner`, `guide/plan`: no `fetch`, `XMLHttpRequest`, `WebSocket`, `Linking`, Bluetooth, `Date.now`, `Math.random` outside `model-store.ts` (model download state), the adapter timeout, and the lane L files (`adapters/gemini-live.ts`, `live/**`), which are the only other network code and are listed in the review. Record the search.
  - _Requirements: 10.1_

- [ ] 7. Lane V: speech module
  - [x] 7.1 Interface
    - Files: `speech/index.ts`, `types.ts`. `SpeechInput`, `createSpeechInput`. No vendor import here.
    - _Requirements: 2.1, 13.2_
  - [x] 7.2 Android recognizer adapter
    - Files: `speech/adapters/android-recognizer.ts`. Blocked by 3.1.
    - `isAvailable(language)` through the vendor's supported-locale call. `listen` asks permission on first use, prefers on-device recognition when the pack exists, never persists audio, aborts on signal, background and `LISTEN_MAX_MS` (unset). Maps errors to `SP_*`.
    - _Requirements: 2.3 to 2.6, 10.3, 10.4_
  - [ ]* 7.3 Unit tests for the error mapping
    - Optional, last.

- [x] 8. Lane U: ui
  - [x] 8.1 Strings
    - Append `guide.plan.*` and `guide.voice.*` keys to `locale/strings/{en,hi,kn}.ts` (append only). `hi` and `kn` are unreviewed drafts (D-031). All text from the Error handling table, "AI suggestion", "This may be wrong. Check the machine.", "Not in view", the model download text, the audio disclosure.
    - _Requirements: 5.4, 6.1, 11.4_
  - [x] 8.2 Goal picker and voice goal
    - Files: `ui/guide/GoalPicker.tsx`, `VoiceGoal.tsx`. Tappable lines placed through `geometry`. Mic only when `isAvailable`. Editable transcript with Confirm.
    - _Requirements: 1.1 to 1.5, 2.1 to 2.7_
  - [x] 8.3 Plan hook and flow
    - Files: `ui/guide/usePlanGuide.ts`, `plan-view-model.ts`, `GuideScreen.tsx` (changed).
    - Capture loop (existing cadence, unset), build PlanRequest, call planner, `groundStep`, dispatch to `planReducer`, cancel on unmount, release camera and mic on background. The only place `planner`, `speech` and `guide` meet.
    - _Requirements: 3.1, 3.4, 7.3, 8.2, 8.3, 9.3, 13.4_
  - [x] 8.4 Views
    - Files: `ui/guide/PlanningView.tsx`, `ModelGate.tsx`, `CannotPlanView.tsx`, `FinishPrompt.tsx`, `StepCard.tsx` (changed), `error-map.ts` (changed).
    - "AI suggestion" label fixed, no setting to hide it. Done always visible. Highlight from `GroundedStep.target` with frame id and expiry. "Not in view" with no highlight. Enter hint, never a value.
    - _Requirements: 4.1, 4.2, 5.3 to 5.8, 6.1 to 6.4, 8.1_
  - [x] 8.5 Mode switcher entry
    - Keep `GUIDE_MODE_ENTRY`. Remove the "verified machine" wording from Guide strings that spec 03 added. No new mode (P1).
  - [ ]* 8.6 Error-map and view-model unit tests
    - Optional, last.

- [ ] 9. Checkpoint: code complete
  - typecheck, lint, `npx expo-doctor`. `npx expo export --platform android` builds. Search the bundle and `src/` for forbidden words: "verified" in Guide strings (except as "not verified"), "AR ", "ARCore", "world tracking", "SLAM". Run the `vision-safety-review` skill and record the result.
  - _Requirements: 5.5, 5.8, 14.9_

- [ ] 10. Device: planner basics (needs the phone and the model file)
  - Run DT-G5-01, DT-G5-02, DT-G5-03 on three real machines chosen by the owner. Record each as PASSED, FAILED or NOT TESTED in `docs/DEVICE-TESTS.md`, with machine, build commit, variant, device, date. No fixture, no TM-01.
  - _Requirements: 14.2 to 14.4_

- [ ] 11. Device: privacy and voice
  - DT-G5-04 (airplane mode, record how no network use was observed), DT-G5-05 (voice in `en`, then `hi` if supported), DT-G5-06 (download interrupt, resume, corrupt file).
  - _Requirements: 14.5 to 14.7_

- [ ] 12. Lane K: Kotlin Expo Module around LiteRT-LM (D-045; needed for any real planning)
  - [x] 12.1 Skeleton and API check
    - Files: `modules/overlaykit-llm/{expo-module.config.json,package.json,index.ts,android/build.gradle,android/src/main/AndroidManifest.xml,android/src/main/java/com/overlaykit/llm/OverlaykitLlmModule.kt}`. Same pattern as `modules/overlaykit-ocr` (D-036).
    - Pin `litertlm-android` per task 3.3. Read the pinned version's Kotlin API and confirm the real names: `Engine`, `EngineConfig`, `Conversation`, `ConversationConfig`, `SamplerConfig`, and whether `ResponseFormat.json` and `enableResponseFormat` exist (DQ-5). Write what was found in the report. If there is no response format, the module ignores `schemaJson` (the prompt carries the shape) and the parser is the only check.
    - Needs: task 3.3 done. The typed JS surface in `design.md` is the contract; change it only by editing `design.md` first.
    - _Requirements: 3.3, 3.5, 3.8, 13.6_
  - [x] 12.2 Engine and generate
    - `load`, `generate`, `cancel`, `release` on one single-thread executor. `initialize()` off the main thread. Fresh `Conversation` per `generate`. Temperature 0, top-k 1. Thinking, tools and speculative decoding off. All exceptions become code strings. Conversation closed before engine, each once.
    - Done check: `npm run typecheck`, `npm run lint`, and `npx expo run:android --device` builds (Gradle assemble at least). No device claim without a DEVICE-TESTS record.
    - _Requirements: 3.3 to 3.6, 4.4, 4.5_
  - [x] 12.4 Model download in the module (lane K; D-049)
    - Add `downloadModel(url, destPath, expectedSize, expectedSha256)` with progress events, `cancelDownload()`, HTTP Range resume of a `<dest>.part` file, a free-space check before the first byte, a SHA-256 check (JDK `MessageDigest`), and an atomic rename on success. It returns strings and numbers only, never throws, and sends no headers beyond the standard ones (no token, no user data). Also add the file hash helper from DQ-1.
    - Done check: typecheck, lint, Gradle assemble. Device behavior goes to DT-G5-12.
    - _Requirements: 4.2, 4.3_
  - [ ] 12.3 Smoke test on the phone (device)
    - Load the model file (owner placed it, task 1.4), run one `generate` with a fixed prompt, record the raw text, load time and peak memory in `docs/DEVICE-TESTS.md` as part of DT-G5-07 prep. If the phone runs out of memory, report `question` with the numbers and the documented fallback (Gemma 4 E2B, which needs a new DECISIONS entry).
    - No phone or no model file: "device validation pending".
    - _Requirements: 4.6_

- [ ] 13. Device: screen loss and backgrounding
  - DT-G5-08. Pause on screen loss and on backgrounding, resume only on a newer observation, mic and camera released.
  - _Requirements: 9.1 to 9.3_

- [ ] 14. Device: measurements and thresholds
  - DT-G5-07 on a **release** build: model load time, time to first token, time per step, peak memory, battery over 10 minutes. Then, for the unset constants (`PLAN_TIMEOUT_MS`, `MODEL_IDLE_RELEASE_MS`, `SCENE_OVERLAP_MIN`, `SCENE_LOST_TIMEOUT_MS`, `GOAL_NOT_SEEN_LIMIT`, `MAX_STEPS_PER_GOAL`, `LISTEN_MAX_MS`, capture cadence, backend (CPU or GPU), context size and output-token cap), propose values from the numbers and record them in a new `docs/DECISIONS.md` entry before setting any constant.
  - Measure Hindi planning quality and record it. Say "unmeasured" for Kannada and for voice languages not run.
  - _Requirements: 4.6, 14.8, 11.3_

- [ ] 15. Optional: error-to-UI and integration tests
  - [ ]* 15.1 Every `PL_*`, `SP_*` and used `GD_*` code maps to one UI state (the `error-map` test)
  - [ ]* 15.2 Run all optional tests once; the owner decides whether to run them (testing policy: ask at the end).

- [ ] 16. Cleanup of dropped TM-01 and fixture code (needs owner agreement, OQ-6)
  - Remove unused fixture types, the `tm01Fixture`, workflow loader and screen matcher that the new path does not use, and their now-orphaned tests **only with the owner's explicit approval of each deletion** (the quality rule forbids deleting tests on our own). List the files and the tests that cover them, and ask first.
  - Mark spec 03 task 4 and the TM-01 device rows as cancelled by D-043.

- [ ] 17. Docs and gate
  - [x] 17.1 `docs/QUALITY-GATES.md`: add gate G5 (AT-G5-01 to 12 from R14) in place of G4 text. No thresholds invented; unset values say "set at task 14".
  - [x] 17.2 `docs/ARCHITECTURE.md`: add `planner` to section 4 and the dependency map in section 5; add `modules/overlaykit-llm` and `modules/overlaykit-live` next to `modules/overlaykit-ocr`; add `PL_LIVE_*` codes; keep T13 to T17 and the Gemini Live assumption in section 11 (written with D-050); add `PL_*` and `SP_*` to section 8; mark `GD_UNSUPPORTED`, `GD_MACHINE_CHANGED`, `GD_FIXTURE_INVALID` as not emitted by the new path; remove the fixture section's TM-01 requirement.
  - [x] 17.3 `docs/DEVICE-TESTS.md`: add the DT-G5 rows (DT-G5-01 to DT-G5-12), all NOT TESTED.
  - [x] 17.4 README and demo text: say plans are AI suggestions that can be wrong; no "verified" or "AR" wording; privacy statement as in R10 and PRODUCT.md P5: "No image leaves the phone unless you turn on Gemini Live". Add the model names, sources and licence notices (D-047: Apache-2.0 for Gemma 4 E2B) to the licence screen or README. Demo and Devpost text must not call Gemini Live "on-device" or "offline".
  - [ ] 17.5 Gemma Terms notice and Prohibited Use Policy (R4.7, D-047, D-048; needed only if the Gemma 3 1B fallback file is used or shared; before any build or link goes to other people)
    - Add a `NOTICE` text file in the repo and on the app's licence screen with exactly: "Gemma is provided under and subject to the Gemma Terms of Use found at gemma.ai/resources/terms".
    - Add the Prohibited Use Policy restrictions (read from `gemma.ai/resources/prohibited_use_policy`) to the README or app terms as an enforceable provision, and say the model is subject to them. Link the full Gemma Terms for recipients.
    - State in the README: the model file is not included; each user gets it under their own acceptance of the terms (sideload only). No model file in git, in the APK, or on any link we publish.
    - Done check: the files exist, and a search of the release bundle finds no `.litertlm` file. The owner reads the terms first. This is not legal advice.

- [ ] 19. Lane L: Gemini Live adapter (new, D-050; needs 1.5 and task 2.2; one real call needs 1.6)
  - [x] 19.1 Check the API and write the protocol (pure)
    - Files: `planner/live/protocol.ts`, `planner/live/manifest.ts`.
    - Read Google's Live API WebSocket reference first and settle DQ-6: where `responseModalities` goes in `setup`, the exact names of `realtimeInput.video`, `.audio`, `.text`, `toolCall`, `toolResponse`, `goAway`, `sessionResumptionUpdate`. Write them in the report. Build and parse messages as pure functions: `buildSetup`, `buildFrameMsg`, `buildTextMsg`, `buildAudioMsg`, `buildToolResponse` (with the call `id` and `{ status, retryable, message }`), `parseServerMessage` (strict, unknown shapes become a typed `unknown`, never thrown). Constants: `LIVE_MODEL_ID = 'gemini-3.8-live'`, host, and the unset thresholds as `NaN`: `LIVE_FRAME_INTERVAL_MS` (not below 1000), `LIVE_PLAN_TIMEOUT_MS`, `LIVE_STEP_MAX_AGE_MS`, `LIVE_IDLE_STOP_MS`.
    - Function declarations `show_step`, `goal_finished`, `cannot_plan` and the fixed system instruction as in `design.md`.
    - Done check: typecheck and lint exit 0. With the owner's key (1.6) and not before: one real session records the server's answers to a bad key and to a good key, with the key never printed.
    - _Requirements: 16.1, 16.8, 16.13_
  - [x] 19.2 Session helper
    - Files: `planner/live/session.ts`.
    - Own the WebSocket (React Native `WebSocket`), the resumption handle, `GoAway` handling, context window compression, timers and cleanup. Never log, show or throw the URL. Every failure is a `PL_LIVE_*` `Result`. `close()` is idempotent, works while connecting, and drops all buffers. No file or storage import.
    - _Requirements: 16.5, 16.6, 16.10, 16.12_
  - [x] 19.3 Adapter and key store
    - Files: `planner/adapters/gemini-live.ts`, `planner/live-key-store.ts`, append export lines to `planner/index.ts`.
    - `createLiveStepPlanner` as in `design.md`: `startSession`, `stopSession`, `sessionState`, `subscribeSession`, `setMic`, `planNext`. `planNext` sends the frame (from `LiveFrameSource`), then the text message (frame id, goal, done steps, numbered lines), waits for one tool call, checks it strictly, replies with a structured tool response, and returns a `PlannerOutput`. It refuses to send anything unless `startSession` succeeded. `live-key-store.ts` wraps `expo-secure-store` (needs 3.4): get, set, delete, masked read; it returns `Result` values.
    - The adapter reads no coordinates from the model. A source search finds no `quad`, `bbox` or `x`/`y` reads from model data.
    - Done check: typecheck and lint exit 0. A source search of `planner/live` and `adapters/gemini-live.ts` finds no `fetch`, no file-system or storage import, no `console.*` and no use of the key outside `live-key-store.ts` and the socket URL builder.
    - _Requirements: 16.1 to 16.9, 16.12, 17.2, 17.3_
  - [ ]* 19.4 Unit tests for `live/protocol.ts` with fixed JSON
    - Optional, last. Fixed strings only, no network, no key.

- [ ] 20. Lane K2: `modules/overlaykit-live` (new, needs 1.5; native)
  - [x] 20.1 Skeleton and JPEG scale
    - Files: `modules/overlaykit-live/**`, same pattern as `modules/overlaykit-ocr`. `scaleJpegBase64(stillUri, maxLongEdge, quality)` using Android `BitmapFactory` and `Bitmap.compress`; honors EXIF rotation; returns the code strings `NO_FILE` or `FAILED`; writes nothing to disk.
    - _Requirements: 16.7_
  - [x] 20.2 Microphone PCM
    - `startMic(onChunk)`, `stopMic()` with `AudioRecord`, 16 kHz, mono, 16-bit, about 50 ms chunks, base64. Permission is requested by the module only on the first `startMic` after the user tapped the mic toggle (`DENIED` otherwise). Stops on `stopMic`. Writes no file.
    - Also measure on the phone (device, DQ-7): time to scale and encode one still, and whether `expo-camera` stills at 1 per second work without a shutter sound and with acceptable load. If not, report `question` with numbers; the capture change is a separate owner decision.
    - Done check: typecheck, lint, Gradle assemble.
    - _Requirements: 16.5, 16.7_

- [ ] 21. Lane U: planner choice, consent, key, banner (new, needs 1.5, 2.2, 3.4, 19.3)
  - [x] 21.1 Settings fields and strings
    - Append `plannerChoice: 'on-device'` and `liveConsent: null` (with a version number) to the settings store in `locale/settings-store.ts`, append-only, defaults safe. Append strings to `locale/strings/{en,hi,kn}.ts` for: planner names, consent text (R16.3), banner, Stop, Start Gemini Live, key screen, mic toggle, and the six `PL_LIVE_*` states. `hi` and `kn` are unreviewed drafts (D-031).
    - _Requirements: 15.1, 16.3, 11.4_
  - [x] 21.2 Planner settings and key screens
    - Files: `ui/guide/PlannerSettings.tsx`, `LiveKeyScreen.tsx`. The choice row opens the key screen when no key and the consent screen when no consent. Paste, replace, remove, masked display. Removing the key ends any session and sets `on-device`.
    - _Requirements: 15.1 to 15.5, 17.1, 17.4, 17.5_
  - [x] 21.3 Consent screen
    - File: `ui/guide/LiveConsentScreen.tsx`. Plain words per R16.3, "Agree and turn on" and "No, keep on-device". Stores the consent with the text version. Declining changes nothing and sends nothing.
    - _Requirements: 16.2, 16.3_
  - [x] 21.4 Banner, start button and send gate
    - Files: `ui/guide/LiveBanner.tsx`, `LiveStartButton.tsx`, `live-view-model.ts`, and the changes in `usePlanGuide.ts` and `GuideScreen.tsx`. "Start Gemini Live" on every session. The banner is rendered from `sessionState()` ("Streaming to Google", red dot, Stop, mic toggle default off). `usePlanGuide` passes frames and mic to the adapter only when the banner state is connecting or open. Stop, leaving Guide, backgrounding, goal done and any error call `stopSession()`. The Guide planner line names the active planner. Both planners show "AI suggestion" and "This may be wrong".
    - Supplies `LiveFrameSource` from `capture` stills through `scaleJpegBase64`, and the mic from the module.
    - _Requirements: 15.2 to 15.6, 16.4 to 16.7, 16.11_
  - [x] 21.5 Error map rows
    - `ui/guide/error-map.ts` (append rows): the six `PL_LIVE_*` codes with the texts and actions in `design.md`. Rows are added to the existing error-map test only under the owner's rows-only approval.
    - _Requirements: 12.2, 16.13_

- [ ] 22. Device: Gemini Live privacy and behavior (needs the phone, the owner's key and tasks 19 to 21)
  - DT-G5-09 (no Google connection with Live off or declined), DT-G5-10 (banner, Stop, background; nothing stored), DT-G5-11 (real goal, bad key, airplane mode), DT-G5-12 (Gemma 4 E2B download, cancel, resume, hash mismatch, low space). Record each as PASSED, FAILED or NOT TESTED in `docs/DEVICE-TESTS.md`. Measure the round trip per step, battery and data use for a 5-minute run, and the Hindi and Kannada goal quality, and say "unmeasured" for anything not run. No device claim without a record.
  - _Requirements: 14.10 to 14.13, 16.14_
- [ ] 18. Final checkpoint (after tasks 19 to 22)
  - typecheck, lint, `npx expo-doctor`, `npx expo install --check`. Report commands with exit codes, files changed, tests (none run unless the owner asked), device status per DT id, open risks. Ask the owner whether to run any tests.
