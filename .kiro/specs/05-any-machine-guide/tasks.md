# Implementation Plan: any-machine-guide

Status: **draft, 2026-11-19.** Written from `requirements.md` and `design.md`. No task is started or complete. A task is checked off only after its done check ran and its output was recorded.

## Overview

Order:
1. Owner approvals (task 1): packages, model, open questions.
2. Shared codes and plan types (task 2). Every lane depends on it.
3. In parallel after task 2: lane P (pure `guide/plan`), lane M (`planner`), lane V (`speech`). Lane U (`ui`) starts when P, M and V have their interfaces committed; it can code against the types before the adapters work.
4. Package install and native build (task 3), by the owner of `package.json` and `app.json`, only after approval.
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
| S shared (task 2 only) | `src/modules/shared/index.ts` | n/a | all else |
| P pure | `src/modules/guide/plan/**` | `src/modules/guide/index.ts` | `planner/`, `speech/`, `ui/`, `locale/`, `components/`, old `guide/*.ts` |
| M planner | `src/modules/planner/**`, `modules/overlaykit-llm/**` (lane K only) | none | `guide/`, `ui/`, `speech/`, `package.json`, `app.json` |
| V speech | `src/modules/speech/**` | none | `guide/`, `ui/`, `planner/`, `package.json`, `app.json` |
| U ui | `src/modules/ui/guide/**` | `src/modules/locale/strings/{en,hi,kn}.ts` (append keys), `src/modules/ui/index.ts` | `guide/`, `planner/`, `speech/` internals (import through `index.ts` only) |
| X native config | `package.json`, `package-lock.json`, `app.json`, `eslint` `VENDOR_OWNERS` list | none | all `src/` code |

## Tasks

- [ ] 1. Owner approvals
  - [ ] 1.1 Approve packages and model
    - Present the table in `design.md` ("Candidate packages") with: `llama.rn` (gate task: 3, 5.3), `expo-speech-recognition` (gate task: 3, 8), model Qwen3-1.7B Q4_K_M. Each request names the package, the task, the SDK 58 support source, and the risk (RN 0.88 unproven, release-candidate version, Android audio disclosure).
    - Record the answer in `docs/DECISIONS.md` as a new entry (next free number). If the owner picks the fallback, open lane K (task 12).
    - _Requirements: OQ-1, OQ-5, R10.4_
  - [ ] 1.2 Owner answers OQ-2 to OQ-8
    - Record any change from the recommended defaults in `requirements.md` before lanes start.
  - [ ] 1.3 Confirm the model source and download tap
    - OQ-2: Hugging Face download on tap, or `adb push` for the demo build. Write the host and file name into the DECISIONS entry. Lane M needs the final URL, size and checksum for `model-manifest.ts`.

- [x] 2. Shared codes and plan types (lane S, first, small)
  - Files: `src/modules/shared/index.ts` (append only).
  - Add `PL_ERROR_CODES`, `PlErrorCode`, `SP_ERROR_CODES`, `SpErrorCode`, `PlanLine`, `PlanRequest`, `PlanAction`, `ProposedStep`, `PlannerOutput` exactly as in `design.md`. Do not edit existing codes.
  - Done check: typecheck and lint exit 0. `src/modules/shared/__tests__/error-codes.test.ts` keeps all existing rows; the owner-approved row additions (new `PL_*` and `SP_*`) are added only if the owner confirms (existing rule: add rows only).
  - _Requirements: 12.1, 13.1_

- [ ] 3. Install packages and prove the native build (lane X; blocked by 1.1)
  - [ ] 3.1 Install the approved packages
    - `npx expo install expo-speech-recognition`; `npm install llama.rn@<exact version>` (not an SDK package, so `expo install` does not pick it; pin the exact version). Then `npx expo install --check` and `npx expo-doctor`. Remove anything unused.
    - Add the config plugin settings in `app.json` (microphone text; no GPU or OpenCL). Make sure `RECORD_AUDIO` is not in `blockedPermissions` (D-038) and no other new permission appears. Keep `recordAudioAndroid: false` for the camera plugin.
    - Add both vendor packages to `VENDOR_OWNERS` in the lint config: `llama.rn` only in `planner/adapters/llama.ts`, `expo-speech-recognition` only in `speech/adapters/android-recognizer.ts`.
    - _Requirements: 10.4, 13.5_
  - [ ] 3.2 Smoke build on the phone or report the blocker
    - `npx expo prebuild --clean`, then `npx expo run:android --device`. Set `abiFilters` to `arm64-v8a` through a config plugin or `expo-build-properties` only if the owner approves that package.
    - Prove: the app starts, `llama.rn` loads, and telemetry of every dependency is off. If RN 0.88 breaks `llama.rn`, stop and report `question` with the error and the fallback (task 12).
    - No phone: report "device validation pending" and what ran (prebuild, Gradle assemble).
    - _Requirements: 4.6, 10.5_

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
  - [ ] 5.1 Interface and prompt
    - Files: `planner/index.ts`, `types.ts`, `prompt.ts`.
    - `StepPlanner`, `createStepPlanner`, `PlannerState`, `buildPrompt`. No network code, no vendor import.
    - _Requirements: 3.1, 3.2, 3.5, 13.1_
  - [ ] 5.2 Output schema and strict parser
    - Files: `planner/schema.ts`.
    - JSON schema, GBNF text, `parseOutput`. No repair of bad output.
    - _Requirements: 3.8_
  - [ ] 5.3 Model store
    - Files: `planner/model-store.ts`, `planner/model-manifest.ts`.
    - Download on tap, resume, size and checksum check (DQ-1), delete on mismatch. Only file with network code. Needs the final URL, size and checksum from task 1.3. Until then the manifest holds `null` and `status()` returns `missing` with `PL_NO_MODEL`.
    - _Requirements: 4.1 to 4.4, 10.1_
  - [ ] 5.4 `llama.rn` adapter
    - Files: `planner/adapters/llama.ts`. Blocked by 3.1.
    - Load, run with grammar and stop tokens, abort on signal, `PL_TIMEOUT`, `PL_UNSUPPORTED_DEVICE` on load failure, release on `release()`. Convert vendor types at this file. Thinking off.
    - _Requirements: 3.3 to 3.6, 4.5_
  - [ ]* 5.5 Unit tests for prompt and parser
    - Optional, last. Fixed strings only, no model.

- [ ] 6. Checkpoint: planner and pure modules
  - typecheck, lint, `npx expo-doctor`. Source search of `planner`, `guide/plan`: no `fetch`, `XMLHttpRequest`, `WebSocket`, `Linking`, Bluetooth, `Date.now`, `Math.random` outside `model-store.ts` (only network file) and the adapter timeout. Record the search.
  - _Requirements: 10.1_

- [ ] 7. Lane V: speech module
  - [ ] 7.1 Interface
    - Files: `speech/index.ts`, `types.ts`. `SpeechInput`, `createSpeechInput`. No vendor import here.
    - _Requirements: 2.1, 13.2_
  - [ ] 7.2 Android recognizer adapter
    - Files: `speech/adapters/android-recognizer.ts`. Blocked by 3.1.
    - `isAvailable(language)` through the vendor's supported-locale call. `listen` asks permission on first use, prefers on-device recognition when the pack exists, never persists audio, aborts on signal, background and `LISTEN_MAX_MS` (unset). Maps errors to `SP_*`.
    - _Requirements: 2.3 to 2.6, 10.3, 10.4_
  - [ ]* 7.3 Unit tests for the error mapping
    - Optional, last.

- [ ] 8. Lane U: ui
  - [ ] 8.1 Strings
    - Append `guide.plan.*` and `guide.voice.*` keys to `locale/strings/{en,hi,kn}.ts` (append only). `hi` and `kn` are unreviewed drafts (D-031). All text from the Error handling table, "AI suggestion", "This may be wrong. Check the machine.", "Not in view", the model download text, the audio disclosure.
    - _Requirements: 5.4, 6.1, 11.4_
  - [ ] 8.2 Goal picker and voice goal
    - Files: `ui/guide/GoalPicker.tsx`, `VoiceGoal.tsx`. Tappable lines placed through `geometry`. Mic only when `isAvailable`. Editable transcript with Confirm.
    - _Requirements: 1.1 to 1.5, 2.1 to 2.7_
  - [ ] 8.3 Plan hook and flow
    - Files: `ui/guide/usePlanGuide.ts`, `plan-view-model.ts`, `GuideScreen.tsx` (changed).
    - Capture loop (existing cadence, unset), build PlanRequest, call planner, `groundStep`, dispatch to `planReducer`, cancel on unmount, release camera and mic on background. The only place `planner`, `speech` and `guide` meet.
    - _Requirements: 3.1, 3.4, 7.3, 8.2, 8.3, 9.3, 13.4_
  - [ ] 8.4 Views
    - Files: `ui/guide/PlanningView.tsx`, `ModelGate.tsx`, `CannotPlanView.tsx`, `FinishPrompt.tsx`, `StepCard.tsx` (changed), `error-map.ts` (changed).
    - "AI suggestion" label fixed, no setting to hide it. Done always visible. Highlight from `GroundedStep.target` with frame id and expiry. "Not in view" with no highlight. Enter hint, never a value.
    - _Requirements: 4.1, 4.2, 5.3 to 5.8, 6.1 to 6.4, 8.1_
  - [ ] 8.5 Mode switcher entry
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

- [ ]* 12. Lane K: fallback runtime as a Kotlin Expo Module (only if 3.2 fails or the owner picks it)
  - Files: `modules/overlaykit-llm/**`, `planner/adapters/litert.ts`. Same pattern as `modules/overlaykit-ocr` (D-036). Needs its own DECISIONS entry and an owner OK before start. It replaces `adapters/llama.ts` behind the same `StepPlanner` interface; nothing else changes.

- [ ] 13. Device: screen loss and backgrounding
  - DT-G5-08. Pause on screen loss and on backgrounding, resume only on a newer observation, mic and camera released.
  - _Requirements: 9.1 to 9.3_

- [ ] 14. Device: measurements and thresholds
  - DT-G5-07 on a **release** build: model load time, time to first token, time per step, peak memory, battery over 10 minutes. Then, for the unset constants (`PLAN_TIMEOUT_MS`, `MODEL_IDLE_RELEASE_MS`, `SCENE_OVERLAP_MIN`, `SCENE_LOST_TIMEOUT_MS`, `GOAL_NOT_SEEN_LIMIT`, `MAX_STEPS_PER_GOAL`, `LISTEN_MAX_MS`, capture cadence, context size and threads), propose values from the numbers and record them in a new `docs/DECISIONS.md` entry before setting any constant.
  - Measure Hindi planning quality and record it. Say "unmeasured" for Kannada and for voice languages not run.
  - _Requirements: 4.6, 14.8, 11.3_

- [ ] 15. Optional: error-to-UI and integration tests
  - [ ]* 15.1 Every `PL_*`, `SP_*` and used `GD_*` code maps to one UI state (the `error-map` test)
  - [ ]* 15.2 Run all optional tests once; the owner decides whether to run them (testing policy: ask at the end).

- [ ] 16. Cleanup of dropped TM-01 and fixture code (needs owner agreement, OQ-6)
  - Remove unused fixture types, the `tm01Fixture`, workflow loader and screen matcher that the new path does not use, and their now-orphaned tests **only with the owner's explicit approval of each deletion** (the quality rule forbids deleting tests on our own). List the files and the tests that cover them, and ask first.
  - Mark spec 03 task 4 and the TM-01 device rows as cancelled by D-043.

- [ ] 17. Docs and gate
  - [ ] 17.1 `docs/QUALITY-GATES.md`: add gate G5 (AT-G5-01 to 08 from R14) in place of G4 text. No thresholds invented; unset values say "set at task 14".
  - [ ] 17.2 `docs/ARCHITECTURE.md`: add `planner` to section 4 and the dependency map in section 5; add `PL_*` and `SP_*` to section 8; mark `GD_UNSUPPORTED`, `GD_MACHINE_CHANGED`, `GD_FIXTURE_INVALID` as not emitted by the new path; remove the fixture section's TM-01 requirement.
  - [ ] 17.3 `docs/DEVICE-TESTS.md`: add the DT-G5 rows, all NOT TESTED.
  - [ ] 17.4 README and demo text: say plans are AI suggestions that can be wrong; no "verified" or "AR" wording; privacy statement as in R10.

- [ ] 18. Final checkpoint
  - typecheck, lint, `npx expo-doctor`, `npx expo install --check`. Report commands with exit codes, files changed, tests (none run unless the owner asked), device status per DT id, open risks. Ask the owner whether to run any tests.
