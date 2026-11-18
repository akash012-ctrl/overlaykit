# Requirements Document

Status: **draft.** The owner asked for all specs to be generated end to end, so this document was written without a review pause. Open questions OQ-1 to OQ-10 use their recommended defaults until the owner decides them. D-029 (TM-01 is a printed panel plus screen images on an iPad), D-031 (no reviewers) and D-032 (AI art, our own text) are applied, and `test-fixtures/tm-01/FIXTURE.md` is the source for the workflow, screens and negative set. Generating this document is not owner approval (CAPABILITY-MAP.md §7).

## Introduction

This spec covers capability C in `docs/CAPABILITY-MAP.md` (§4.C and §5): Guide, the mode that walks a user through one task on the verified machine TM-01, one step at a time. It delivers gate G4 (AT-G4-01 to AT-G4-06 and AT-G4-08 in `docs/QUALITY-GATES.md`), the QE-1, QE-2 and QE-3 checks for the `GD_*` codes, and the device tests DT-G4-01 to DT-G4-04, DT-G4-06, DT-ERR-04 and DT-ERR-05. AT-G4-07 (voice) belongs to spec D.

What this spec adds:

1. The TM-01 fixture extension: screens and workflows in `en`, `hi` and `kn`, with the review status `unreviewed` on `hi` and `kn` text (D-031), and a record that each workflow was performed on the fixture (PRODUCT.md "verified" items 1 and 2; item 3 is OQ-10). The content is the workflow "Buy a single-journey ticket" (steps W1 to W6) and the screens S01 to S06 in `test-fixtures/tm-01/FIXTURE.md` sections 5 and 6.
2. Screen images shown on an iPad (D-029): one image per Screen, swapped by hand by a person. The iPad shares nothing with the app.
3. A screen matcher in the `components` module that says which TM-01 screen an observation shows, or that it can't tell. "Can't tell" never counts as a match.
4. The `guide` module: a workflow loader that rejects an incomplete fixture (`GD_FIXTURE_INVALID`) and a pure reducer (D-019).
5. A transition proof for every step change.
6. The active-target highlight, placed through `locateComponents` and the `geometry` module.
7. The Guide UI: task picker, step card, Done, checkpoint-not-seen prompt, refusal state, pause, cancel, completion, and backgrounding behaviour.
8. A Speak slot in the step card that stays hidden until spec D (CM-2).

Guide follows P6, D-008 and D-009. Guide starts only on a `verified` MachineMatch. Step text is authored fixture content, and `hi` and `kn` text carries the status `unreviewed` (D-031). It is never generated, inferred or translated at runtime. A step advances only when the camera sees its checkpoint in two consecutive, distinct observations, or on Done for a step the fixture marks manual. A timer never advances a step.

Sources, in order of precedence: `docs/PRODUCT.md` (rules P1 to P8, Guide mode, scenario S1 and S1-N), `docs/DECISIONS.md` (D-xxx), `docs/ARCHITECTURE.md` (§6 Guide, §8 error states, §10 fixture), `docs/QUALITY-GATES.md`, `docs/DEVICE-TESTS.md`, `docs/CAPABILITY-MAP.md`, and the workspace steering files. Where these sources conflict, the conflict is listed under Open Questions with a recommended default.

**Library-neutral.** This spec adds no runtime dependency. The reducer, the loader and the screen matcher are plain TypeScript.

**Dependencies that need owner approval before they are added** (stack steering, "Adding a dependency"):

- A property-test library (fast-check is the candidate). `package.json` doesn't list one yet, and the quality steering requires property tests for the Guide reducer. It was meant to be chosen in G0. Gate task: AT-G4-03. Compatibility with the Jest 30 and `jest-expo` 58 setup must be checked and cited before `npx expo install` or `npm install -D`. This document does not install it.

No dependency is added by writing this document.

**Relationship to specs A, B and D.**

- Spec A supplies `FrameRef`, `OcrResult`, the Overlay_Layer, the Cover transform and the `placeLabels` and visibility functions of the `geometry` module.
- Spec B supplies `MachineMatch`, `identifyMachine`, `locateComponents`, the MachineFixture's `identification` and `components` sections, the Fixture validator, `t(key)`, the Settings route and the Explore mode. This spec extends the same fixture (CM-1).
- Spec D supplies the `speech` module and the Speak control. This spec ships only the hidden slot (CM-2).

**Out of scope:** speech playback and AT-G4-07 (spec D), any machine other than TM-01, generating or translating steps at runtime, the Settings route (spec B), release packaging (spec D), a kiosk simulator app (rejected in D-029), analytics, login, and any image upload.

**Thresholds.** Numeric thresholds copied from QUALITY-GATES.md or ARCHITECTURE.md are *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Values the docs don't give are Named threshold constants with values set at G4 and recorded in `docs/DECISIONS.md`. This document invents no values for them.

**Device criteria.** A criterion tagged "Device" is verified only on the Reference phone, with a PASSED record in `docs/DEVICE-TESTS.md` that names the build commit, variant, device and date. Until that record exists, its status is "device validation pending". On the date of writing, no phone is connected, so every device criterion is pending.

## Glossary

- **OverlayKit_App**: the Expo Android app in this repository.
- **Camera_Screen**: the `ui` screen at the index route (spec A). It shows the preview or the shown still, the mode switcher and the Overlay_Layer.
- **Overlay_Layer**: the part of the Camera_Screen that draws Overlay items over the shown still (spec A).
- **Guide_Screen**: the `ui` view shown on the Camera_Screen while the mode is Guide.
- **Task_Picker**: the Guide_Screen state that lists the workflows offered for the current verified machine.
- **Step_Card**: the Guide_Screen panel that shows the current step.
- **Speak_Slot**: the reserved place in the Step_Card where spec D puts the Speak control. In this spec it renders nothing.
- **Refusal_State**: the Guide_Screen state shown for `GD_UNSUPPORTED`.
- **Test_Suite**: the Jest unit and property tests run by `npm test` (D-023).
- **Device_Tester**: the person who runs the `docs/DEVICE-TESTS.md` cases on the Reference phone.
- **Fluent_Reviewer**: a fluent speaker of Hindi or Kannada who reviews fixture text (owner Q5). None is named (D-031); until one is, content carries the status `unreviewed`.
- **Unreviewed**: the review status of every `hi` and `kn` step text, title, Expected result and component explanation authored by the team without a Fluent_Reviewer (D-031). It is a permitted state, never shown or described as reviewed.
- **Reference phone**: the Android phone named under owner question Q4 in `tasks/todo.md`.
- **guide module**: `src/modules/guide`. Owns the Workflow loader, the Guide reducer and the observation evaluation.
- **components module**: `src/modules/components`. Owns the TM-01 fixture data, machine identification, component location and the Screen matcher.
- **geometry module**: `src/modules/geometry`. Pure functions that convert between coordinate spaces.
- **shared module**: `src/modules/shared`. Core types, `Result` and error codes.
- **ui module**: `src/modules/ui`. The only module that wires other modules together. It holds the machine-lost timer.
- **speech module**: `src/modules/speech` (spec D).
- **TM-01**: the verified ticket machine fixture (PRODUCT.md). Its form is a self-authored printed panel plus one screen image per Screen, shown passively on an iPad (D-029, D-032). It is a first-party simulated machine. Its ground truth is `test-fixtures/tm-01/FIXTURE.md`.
- **MachineFixture**: the typed TM-01 data in the components module (ARCHITECTURE.md §10). Spec B defines its `id`, `version`, `verification`, `identification`, `components` and `review` fields. This spec adds `screens` and `workflows`.
- **Screen**: one display state of TM-01, such as "choose ticket type", with identifying text that can be read from a frame.
- **Screen image**: an image, with AI-generated art and text added by us, that shows one Screen's text in the screen area of the TM-01 base panel image. It is shown on an iPad, and a person swaps it by hand (D-029, D-032). FIXTURE.md names them S01 to S06.
- **Screen matcher**: `matchScreen(ocr)` in the components module. It returns which Screen an OcrResult shows, or that it can't tell.
- **ScreenMatch**: the result of the Screen matcher: `matched` with a Screen id, or `cannot-tell`, plus the frameId of the OcrResult.
- **Workflow**: an authored task on TM-01, with a title and an ordered list of steps.
- **Step**: one instruction in a Workflow, with a target component, an instruction text in each locale, an expected visible result, and a checkpoint.
- **Checkpoint**: what ends a Step. It is either `text-visible` (a text that must be seen in the camera image, optionally on a named Screen) or `manual` (the user taps Done).
- **Expected result**: the authored sentence, recorded when the Workflow was performed on the fixture, that says what the user should see when the Step is done.
- **Workflow loader**: the pure function in the guide module that validates a Workflow in the MachineFixture and returns it, or `GD_FIXTURE_INVALID`.
- **Guide observation**: the evaluated form of one OcrResult for Guide: an observation id, a frameId, a sequence number, the machine status, and the checkpoint result for the current Step (`met`, `not-met` or `cannot-tell`).
- **Guide reducer**: the pure function `(state, event) → state` in the guide module (D-019). It imports no React, React Native, camera or clock.
- **Guide state**: the reducer's state: status (`idle`, `running`, `paused`, `cancelled`, `completed`), the Workflow id, the current Step index, the consecutive-match record, the Transition proof list, and the last error code.
- **Guide event**: an input to the reducer: start, observation, confirm-manual, machine-lost, interrupted, retry, step-back, cancel, or reset.
- **Consecutive-match record**: the reducer's record of the Guide observations that matched the current Step's Checkpoint without a non-matching observation in between.
- **Transition proof**: the record of why a Step changed: either the two frameIds (and observation ids) of the matching observations, or the user's Done confirmation.
- **Machine-lost timeout**: the time without a `verified` observation after which the ui module sends the machine-lost event. A Named threshold constant (proposed 3 s, ARCHITECTURE.md §8).
- **Checkpoint-not-seen limit**: the number of consecutive `not-met` observations on a `verified` machine after which Guide shows `GD_CHECKPOINT_NOT_SEEN`. A Named threshold constant (OQ-4).
- **MachineMatch**: the result of `identifyMachine` (spec B): a status of `verified`, `ambiguous` or `none` and the frameId of its OcrResult.
- **Located component**: a fixture component mapped into the frame by `locateComponents` (spec B), with the frameId of its source.
- **Highlight**: the Overlay item that marks the current Step's target component in the Overlay_Layer.
- **Unverified machine**: any machine whose MachineMatch status is `ambiguous` or `none`.
- **Named threshold constant**: a numeric threshold defined once, in one source file, under a descriptive name, and covered by a test.
- **Recorded OCR snapshot**: a JSON file and its still photo from spec A, stored in `test-fixtures/`.
- **Negative set**: the images NEG-01 to NEG-10 listed in `test-fixtures/tm-01/FIXTURE.md` section 8 and in `docs/DEVICE-TESTS.md`.
- **Debug build / Release build**: the builds produced by build gates B1 and B2.

## Requirements

### Requirement 1: Screen and workflow fixture data

**User Story:** As a developer of Guide, I want TM-01's screens and workflows as typed, bundled content, so that every step the user sees was authored, performed and marked with its review status.

Source: P6, D-008, D-017, PRODUCT.md (verified items 1 to 3), ARCHITECTURE.md §10, CAPABILITY-MAP.md §4.C and CM-1, D-029, D-031, D-032, `test-fixtures/tm-01/FIXTURE.md` sections 5 and 6.

#### Acceptance Criteria

1. THE components module SHALL hold the TM-01 `screens` and `workflows` as typed data in the MachineFixture, bundled with the app, with no remote loading (D-017).
2. THE MachineFixture SHALL list each Screen with an id and the identifying texts that distinguish it from the other Screens.
3. THE MachineFixture SHALL list each Workflow with an id, a title in `en`, `hi` and `kn`, and an ordered list of Steps.
4. THE MachineFixture SHALL give each Step an id, a target component id, an instruction in `en`, `hi` and `kn`, an Expected result in `en`, `hi` and `kn`, and a Checkpoint.
5. THE MachineFixture SHALL define a `text-visible` Checkpoint with the text to be seen and, optionally, the id of the Screen on which it appears.
6. THE MachineFixture SHALL record, for each Workflow, who performed it on TM-01, the date, and the method (`on-site` or `replica`) (PRODUCT.md "verified" item 2).
7. THE MachineFixture SHALL record, for `hi` and `kn` text of each Workflow, a review status that is either `unreviewed` or a Fluent_Reviewer with review date, and SHALL hold `unreviewed` for every value while no reviewer exists (D-031; PRODUCT.md "verified" item 3 is OQ-10).
8. THE MachineFixture SHALL contain exactly the Workflows that were performed on TM-01, and no Workflow for any other machine.
9. THE components module SHALL hold no step text that was generated, inferred or machine-translated, and SHALL mark each text as authored in the fixture's review record (D-008).
10. THE MachineFixture SHALL record that TM-01 is a first-party simulated machine made of a printed panel and screen images (D-029).
11. THE MachineFixture SHALL keep the `identification` and `components` sections unchanged from spec B, so that Explore continues to work.
12. THE MachineFixture SHALL contain the Workflow "Buy a single-journey ticket" with Steps W1 to W6, each with the target component, Screen and Checkpoint listed in `test-fixtures/tm-01/FIXTURE.md` section 5, and the Screens S01 to S06 with the on-screen texts listed in section 6, and SHALL take the `en` instruction of each Step from that table.
13. THE MachineFixture SHALL define Step W5 as a `manual` Checkpoint and Steps W1, W2, W3, W4 and W6 as `text-visible` Checkpoints with the texts given in FIXTURE.md section 5.
14. THE README and the demo script SHALL state that the `hi` and `kn` step text and explanations are `unreviewed` and have not been checked by a fluent speaker (D-031).

Verification: unit tests with the bundled fixture and the Workflow loader (Requirement 4). The `hi` and `kn` content is authored by the team and marked `unreviewed` (D-031); the owner checks it, and AT-G4-06 is recorded as the owner's own check with its limits stated. Criteria 12 to 14 are checked by review of the fixture file against FIXTURE.md and of the README and demo script.

### Requirement 2: Screen images on an iPad

**User Story:** As the owner, I want TM-01's screens shown as images on an iPad that a person swaps by hand, so that the demo is repeatable, uses no third-party branding, and the app learns the screen only through the camera.

Source: PRODUCT.md (TM-01 option b), D-022, D-029, D-032, `test-fixtures/tm-01/FIXTURE.md` sections 1, 2 and 6, CAPABILITY-MAP.md §4.C, product steering (No hidden fixture state).

#### Acceptance Criteria

1. THE project SHALL provide one Screen image for each Screen in the MachineFixture (S01 to S06), reusing one base panel image so that only the screen area differs between Screen images (D-032).
2. THE Screen images SHALL be self-authored or AI-generated art with all text added by us, and SHALL show no people, faces, third-party logo, brand name or trademark.
3. THE text on each Screen image SHALL contain every identifying text that the MachineFixture lists for that Screen.
4. THE OverlayKit_App SHALL learn which Screen is shown only through the camera and OCR.
5. THE OverlayKit_App SHALL receive no Screen state through Bluetooth, network, shared storage, shared code, deep links or timers.
6. THE iPad SHALL run no kiosk app or web page, SHALL show the Screen images only as a passive display advanced by a person, and SHALL share no code, storage, link or network channel with the OverlayKit_App (D-029).
7. THE demo, README and submission text SHALL call TM-01 a first-party simulated machine, never support for a real-world machine.
8. THE project SHALL list each Screen image in `docs/DEVICE-TESTS.md` under Physical fixtures, with its Screen id.

Verification: review of the fixture list and image artwork. A source search for any channel that carries Screen state to the app. The final images don't exist yet and every box in FIXTURE.md is DRAFT, so no test relies on a box until it is measured (FIXTURE.md §2.6). With no phone connected, every device test of Guide is "device validation pending".

### Requirement 3: Screen matcher

**User Story:** As a user, I want the app to match the checkpoint only when it clearly sees the right screen, so that it never moves on because of a guess.

Source: D-019, D-009, ARCHITECTURE.md §6 (Guide), §11 (T7, T8), CAPABILITY-MAP.md §4.C, AT-G4-03.

#### Acceptance Criteria

1. WHEN the ui module or the guide module passes an OcrResult to `matchScreen`, THE components module SHALL return a ScreenMatch that is either `matched` with one Screen id, or `cannot-tell`, and that carries the OcrResult's frameId.
2. THE components module SHALL return `cannot-tell` when no Screen's identifying texts are found, when the identifying texts of two or more Screens are found with no single best Screen, or when the OcrResult carries `OCR_LOW_QUALITY`.
3. THE components module SHALL treat `cannot-tell` as not matching any Screen and any Checkpoint.
4. THE components module SHALL match texts after case and whitespace normalization, using only lines whose Script is Latin or Devanagari, with the same normalization as machine identification (spec B).
5. THE components module SHALL define the number of identifying texts that must be found for a `matched` result, and the margin between the best and second-best Screen, as Named threshold constants, set at G4 from Recorded OCR snapshots and recorded in `docs/DECISIONS.md`.
6. WHEN the same OcrResult is matched twice, THE components module SHALL return the same ScreenMatch (deterministic).
7. THE components module SHALL make no network request and SHALL use no translation.
8. THE components module SHALL derive a `text-visible` Checkpoint result of `met` only when the Checkpoint's text is found in the OcrResult and, where the Checkpoint names a Screen, the ScreenMatch is `matched` with that Screen id.
9. THE components module SHALL derive a Checkpoint result of `cannot-tell` when the ScreenMatch is `cannot-tell` or the OcrResult carries `OCR_LOW_QUALITY`, and `not-met` otherwise.
10. THE components module SHALL treat OCR text as plain data and SHALL NOT interpret it as a link, command or instruction (T8).

Verification: unit tests on Recorded OCR snapshots of each Screen image, once they exist, with named fields changed for the ambiguous and partial cases (QE-1 inputs). Property test: removing identifying texts from a matched OcrResult never changes a `cannot-tell` result into `matched`. Device: DT-G4-02, device validation pending.

### Requirement 4: Workflow loader and fixture validation

**User Story:** As a developer, I want a Workflow rejected before it is offered if it is incomplete, so that no step with a missing locale, a missing review status or a broken reference reaches a user.

Source: P6, D-008, D-017, ARCHITECTURE.md §8 (`GD_FIXTURE_INVALID`), AT-G4-06, QE-1, QE-2.

#### Acceptance Criteria

1. THE guide module SHALL provide a Workflow loader that takes the MachineFixture and a Workflow id and returns a Result holding the validated Workflow or `GD_FIXTURE_INVALID`.
2. IF a Workflow or Step is missing an `en`, `hi` or `kn` value in its title, instruction or Expected result, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
3. IF the `hi` or `kn` review status of a Workflow is missing, or is a reviewed status with an empty Fluent_Reviewer or review date, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`. A review status of `unreviewed` SHALL be accepted (D-031).
4. IF a Workflow has no record of who performed it, when and how, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
5. IF a Step's target component id is not in the MachineFixture's components, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
6. IF a Checkpoint names a Screen id that is not in the MachineFixture's screens, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
7. IF a `text-visible` Checkpoint has an empty text, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
8. IF a Workflow has no Steps, or two Steps share an id, THEN THE Workflow loader SHALL return `GD_FIXTURE_INVALID`.
9. IF the Workflow loader returns `GD_FIXTURE_INVALID`, THEN THE ui module SHALL leave that Workflow out of the Task_Picker.
10. IF every Workflow is left out, THEN THE ui module SHALL show the Guide_Screen with the text "Step-by-step help isn't available" and the offer of Translate and Explore.
11. THE Test_Suite SHALL run the Workflow loader on every Workflow in the bundled MachineFixture and fail if any returns `GD_FIXTURE_INVALID`.
12. THE guide module SHALL give the Workflow loader no network access and no side effects.
13. THE Workflow loader SHALL name the failing field in the error detail, for use in tests and the debug log only.

Verification: unit tests with one valid fixture and one invalid fixture per rule (criteria 2 to 8), and a mutation property test: removing any single required field from a valid Workflow yields `GD_FIXTURE_INVALID` (AT-G4-06, QE-1). Device: the loader runs at start-up in a debug build, device validation pending.

### Requirement 5: Guide start and refusal

**User Story:** As a user at a machine the app doesn't know, I want Guide to say so and offer Translate and Explore, so that I'm never given steps for the wrong machine.

Source: P6, D-009, ARCHITECTURE.md §6 (Guide step 1), §8 (`GD_UNSUPPORTED`, `MCH_*`), PRODUCT.md (S1-N), AT-G4-01, DT-G4-01.

#### Acceptance Criteria

1. WHEN the user opens Guide, THE ui module SHALL pass the latest MachineMatch to the guide module.
2. WHEN the guide module receives a start event for a `verified` MachineMatch and a valid Workflow, THE Guide reducer SHALL set the status to `running` at the first Step.
3. IF the guide module receives a start event for a MachineMatch whose status is `ambiguous` or `none`, THEN THE Guide reducer SHALL leave the status at `idle` and set the error `GD_UNSUPPORTED`.
4. WHILE the error is `GD_UNSUPPORTED`, THE Guide_Screen SHALL show the Refusal_State with the text "This machine isn't verified, so step-by-step help is off." and one control each for Translate and Explore.
5. THE Guide_Screen SHALL show no Step, no Step text and no Highlight in the Refusal_State.
6. WHEN the user taps Translate or Explore in the Refusal_State, THE ui module SHALL switch the mode to that mode.
7. WHEN a start event arrives for a Workflow whose Workflow loader result is `GD_FIXTURE_INVALID`, THE Guide reducer SHALL leave the status at `idle` and the guide module SHALL NOT produce any Step.
8. THE guide module SHALL produce Steps only for a MachineMatch whose status is `verified`, and SHALL produce none for `ambiguous` or `none`.
9. WHEN the MachineMatch is `verified`, THE Guide_Screen SHALL show the Task_Picker with the title of each valid Workflow in the UI language.
10. WHEN the user selects a Workflow in the Task_Picker, THE ui module SHALL send the start event for that Workflow.
11. THE Guide_Screen SHALL add the Guide mode to the mode switcher only when this spec delivers it (CM-4).
12. THE Guide_Screen SHALL show a short note that the app can't detect tampering with the machine (T8), in the UI language.

Verification: unit tests for criteria 2, 3, 5, 7 and 8 using the negative-set Recorded OCR snapshots (AT-G4-01, QE-1 for `GD_UNSUPPORTED`). A property test: for any MachineMatch status other than `verified`, the start event never changes `idle`. Device: DT-G4-01, device validation pending.

### Requirement 6: Guide reducer purity and structure

**User Story:** As a developer, I want the step logic to be a pure function with no camera or React in it, so that I can test every order of events on a Windows machine.

Source: D-019, ARCHITECTURE.md §6 (Guide step 6) and §5, architecture steering (State, Layers), quality steering (property tests), AT-G4-03.

#### Acceptance Criteria

1. THE Guide reducer SHALL be a pure function of the Guide state and one Guide event, returning a new Guide state.
2. THE Guide reducer SHALL import only the shared module and types from the components and geometry modules, and SHALL import no React, no React Native, no capture module, no ocr module, no clock and no random source.
3. THE Guide reducer SHALL take every time value from the Guide event, and SHALL NOT read the current time.
4. THE Guide reducer SHALL return the same Guide state for the same Guide state and Guide event.
5. THE Guide reducer SHALL NOT mutate its input Guide state.
6. THE guide module SHALL provide a separate pure function that turns an OcrResult, a MachineMatch and a Checkpoint result into a Guide observation, so that the Guide reducer receives only evaluated values.
7. THE guide module SHALL import only the components module, the geometry module and the shared module (ARCHITECTURE.md §5).
8. THE Guide reducer SHALL define every Guide event and every Guide state field as a typed value in the guide module's `index.ts`.
9. THE Guide reducer SHALL return a Guide state for every event in every status, and SHALL throw nothing.

Verification: static check by lint (restricted imports, Q4) and a unit test that imports the reducer in a Node environment without React Native. Property tests (Requirement 15).

### Requirement 7: Step advance on two matching observations

**User Story:** As a user, I want a step to finish only when the camera has clearly seen the result twice, so that one glimpse or a misread doesn't move me on.

Source: D-019, P6, ARCHITECTURE.md §6 (Guide step 4), AT-G4-03, DT-G4-02.

#### Acceptance Criteria

1. WHILE the status is `running` and the current Step's Checkpoint is `text-visible`, WHEN a Guide observation with machine status `verified` and Checkpoint result `met` is accepted, THE Guide reducer SHALL add it to the Consecutive-match record.
2. WHEN the Consecutive-match record holds two accepted Guide observations with different observation ids and different frameIds, THE Guide reducer SHALL advance to the next Step exactly once, clear the Consecutive-match record and add one Transition proof.
3. WHILE the status is `running`, IF an accepted Guide observation has a Checkpoint result of `not-met` or `cannot-tell`, or a machine status other than `verified`, THEN THE Guide reducer SHALL clear the Consecutive-match record and SHALL NOT advance.
4. THE Guide reducer SHALL advance by at most one Step for any one Guide event.
5. WHEN the Guide reducer advances from the last Step, THE Guide reducer SHALL set the status to `completed`.
6. THE Guide reducer SHALL treat two Guide observations as consecutive only when no other accepted Guide observation lies between them.
7. WHILE the current Step's Checkpoint is `manual`, THE Guide reducer SHALL leave the Step unchanged for every Guide observation, whatever its Checkpoint result.
8. WHEN the Guide reducer advances, THE Guide reducer SHALL start the next Step with an empty Consecutive-match record, so that observations that matched the earlier Step can't count for the next one.
9. THE guide module SHALL use exactly two as the number of consecutive matches, defined as a Named threshold constant with a test (D-019).

Verification: unit tests for criteria 1 to 9 and property tests (Requirement 15) on sequences built from Recorded OCR snapshots. Device: DT-G4-02, device validation pending (AT-G4-03).

### Requirement 8: Duplicate and out-of-order observations

**User Story:** As a user, I want repeated or late camera results to be ignored, so that a delayed frame never moves me forward or back.

Source: D-019, D-020, ARCHITECTURE.md §6 (Guide step 4), AT-G4-03.

#### Acceptance Criteria

1. THE guide module SHALL give every Guide observation an observation id and a sequence number that increases with capture order (the capture timestamp of its frame).
2. IF the observation id of a Guide observation equals one the Guide reducer has already accepted, THEN THE Guide reducer SHALL ignore it and return the Guide state unchanged.
3. IF the frameId of a Guide observation equals the frameId of a Guide observation the Guide reducer has already accepted, THEN THE Guide reducer SHALL ignore it and return the Guide state unchanged.
4. IF the sequence number of a Guide observation is not greater than the sequence number of the last accepted Guide observation, THEN THE Guide reducer SHALL ignore it and return the Guide state unchanged.
5. THE Guide reducer SHALL NOT let an ignored Guide observation add to, clear or advance the Consecutive-match record, and SHALL NOT rewind a Step.
6. WHEN the same Guide observation is applied twice in a row, THE Guide reducer SHALL return the same Guide state as when it is applied once (idempotence).
7. THE Guide reducer SHALL accept Guide observations only while the status is `running` or `paused`, and SHALL ignore them in every other status.
8. IF a Guide observation's frameId is not the frameId of a frame the ui module has shown or processed, THEN THE ui module SHALL NOT pass it to the guide module.

Verification: unit tests for criteria 2 to 5 and 7. Property tests for criterion 6 and for any permutation, duplication and replay of a sequence (Requirement 15). Device: DT-G4-02, device validation pending.

### Requirement 9: Manual steps and Done

**User Story:** As a user doing a step the camera can't see, such as taking my card out, I want to say it's done myself, so that the workflow can continue.

Source: D-019, PRODUCT.md (S1 step 5), ARCHITECTURE.md §6 (Guide step 4), AT-G4-03.

#### Acceptance Criteria

1. WHILE the status is `running` and the current Step's Checkpoint is `manual`, WHEN the user taps Done, THE Guide reducer SHALL advance to the next Step exactly once and add one Transition proof of kind Done.
2. WHILE the current Step's Checkpoint is `text-visible`, THE Guide_Screen SHALL show no Done control.
3. WHILE the current Step's Checkpoint is `manual`, THE Guide_Screen SHALL show a Done control with a touch target of at least 48 × 48 dp, an accessibilityRole and an accessibilityLabel in the UI language.
4. WHILE the current Step's Checkpoint is `text-visible`, IF the Guide reducer receives a confirm-manual event, THEN THE Guide reducer SHALL ignore it and return the Guide state unchanged.
5. IF the status is `paused`, `cancelled`, `idle` or `completed`, THEN THE Guide reducer SHALL ignore a confirm-manual event.
6. WHEN two confirm-manual events arrive for the same Step, THE Guide reducer SHALL advance once and ignore the second.
7. WHEN the user taps Done on a manual Step, THE Guide reducer SHALL NOT require the machine to be seen in that moment.

Verification: unit tests for criteria 1 to 6, and property tests (Requirement 15). Device: DT-G4-02, device validation pending.

### Requirement 10: No timer advance, pause when the machine is lost, cancel when it changes

**User Story:** As a user, I want a workflow to wait when I look away and to stop if I turn to another machine, so that I never get steps for the wrong thing.

Source: D-019, ARCHITECTURE.md §6 (Guide step 5) and §8 (`GD_MACHINE_LOST`, `GD_MACHINE_CHANGED`), AT-G4-03, AT-G4-04, AT-G4-05, DT-G4-03, QE-1, QE-2.

#### Acceptance Criteria

1. THE guide module SHALL define the Machine-lost timeout as a Named threshold constant, proposed as 3 s (ARCHITECTURE.md §8), with the value confirmed once at G4 and any change recorded in `docs/DECISIONS.md`.
2. THE ui module SHALL own the machine-lost timer, and SHALL send the machine-lost event to the Guide reducer when no `verified` MachineMatch has arrived for the Machine-lost timeout.
3. THE Guide reducer SHALL take no time value other than the ones carried by Guide events (Requirement 6).
4. WHILE the status is `running`, WHEN the Guide reducer receives a machine-lost event, THE Guide reducer SHALL set the status to `paused`, set the error `GD_MACHINE_LOST`, clear the Consecutive-match record and keep the current Step.
5. WHILE the status is `paused`, THE Guide reducer SHALL leave the current Step unchanged for every Guide observation except a Guide observation with machine status `verified`.
6. WHILE the status is `paused`, WHEN a Guide observation with machine status `verified` is accepted, THE Guide reducer SHALL set the status to `running`, clear the error and keep the current Step, and SHALL NOT count that Guide observation toward the Consecutive-match record.
7. WHILE the status is `paused`, THE Guide_Screen SHALL show the text "Paused. Point the camera at the machine to continue." and no Highlight.
8. WHILE the status is `running` or `paused`, WHEN a Guide observation reports a machine status of `verified` for a machine other than TM-01, THE Guide reducer SHALL set the status to `cancelled` and the error `GD_MACHINE_CHANGED`.
9. WHILE the status is `cancelled`, THE Guide_Screen SHALL show the text "Guide stopped. A different machine was found." with a control to start again, and no Step and no Highlight.
10. WHEN the user taps the start-again control, THE ui module SHALL send a reset event and the Guide reducer SHALL return to `idle` with an empty Consecutive-match record and no Transition proof.
11. THE Guide reducer SHALL advance no Step because of any time value, machine-lost event or any event other than an accepted matching Guide observation pair or a Done confirmation (Requirements 7 and 9).
12. WHILE the status is `running`, WHEN a Guide observation with machine status `ambiguous` or `none` arrives, THE Guide reducer SHALL clear the Consecutive-match record and keep the current Step, and SHALL NOT cancel the Workflow.
13. THE guide module SHALL define the criterion for "a different machine" in one place, so that a `verified` MachineMatch for a machine id other than the Workflow's machine id is the only trigger (OQ-3).

Verification: unit tests for criteria 4 to 6, 8, 10 and 12, and a unit test that no sequence of machine-lost events advances a Step. Property tests (Requirement 15). Device: DT-G4-03 (AT-G4-04) and DT-G4-04 (AT-G4-05), device validation pending (QE-2 for `GD_MACHINE_LOST` and `GD_MACHINE_CHANGED`).

### Requirement 11: Transition proof

**User Story:** As a developer and as the owner, I want every step change to record why it happened, so that a test or a log can show that no step advanced by luck or by a timer.

Source: CAPABILITY-MAP.md §2 ("Transition proof") and §4.C, D-019, AT-G4-03.

#### Acceptance Criteria

1. WHEN the Guide reducer advances a Step, THE Guide reducer SHALL append one Transition proof to the Guide state.
2. WHEN the advance is caused by Guide observations, THE Transition proof SHALL hold the from-Step id, the to-Step id, the two frameIds and the two observation ids.
3. WHEN the advance is caused by Done, THE Transition proof SHALL hold the from-Step id, the to-Step id and the kind Done, with the Done event's own time value.
4. THE Guide reducer SHALL append no Transition proof for any event that doesn't change the current Step.
5. THE Transition proof list SHALL satisfy the invariant that its length equals the number of Step advances in the Guide state, and that its entries are in order.
6. THE Transition proof of two Guide observations SHALL hold two different frameIds, both of which were accepted by the Guide reducer.
7. THE guide module SHALL expose the Transition proof list to the ui module as read-only data.
8. WHERE the build is a debug build, THE ui module SHALL write each Transition proof to the debug log without recognized text, and THE release bundle SHALL write none.
9. THE Transition proof SHALL contain no image data and no OCR text.

Verification: unit tests for criteria 1 to 4 and 6. Property test for criterion 5 (Requirement 15). Review for criterion 8 and 9. Device: debug log read during DT-G4-02, device validation pending.

### Requirement 12: Active-target highlight

**User Story:** As a user, I want the part of the machine I should use marked on the camera image, so that I can find it.

Source: PRODUCT.md (Guide mode), ARCHITECTURE.md §6 (Guide step 3) and §8 (`CMP_NOT_VISIBLE`), architecture steering (only `geometry` converts coordinates), D-020, AT-G4-02, DT-G4-02, DT-ERR-04.

#### Acceptance Criteria

1. WHILE the status is `running`, THE ui module SHALL call `locateComponents` with the latest `verified` MachineMatch and its OcrResult, and SHALL draw a Highlight over the Located component that is the current Step's target component.
2. THE ui module SHALL obtain the Highlight's view position only from the geometry module, with no coordinate math in the ui module.
3. THE Highlight SHALL carry the frameId of the Located component it marks, and SHALL be removed with its still according to the Overlay lifetime rules of spec A (D-020).
4. THE ui module SHALL draw a Highlight for the current Step's target component only, and for no other component.
5. IF `locateComponents` reports `CMP_NOT_VISIBLE` for the target component, THEN THE ui module SHALL draw no Highlight and show the prompt "Point the camera at the [component]" with the component's name in the UI language.
6. WHILE the status is `paused`, `cancelled`, `idle` or `completed`, THE ui module SHALL draw no Highlight.
7. WHILE the status is `running`, IF the latest MachineMatch is `ambiguous` or `none`, THEN THE ui module SHALL draw no Highlight.
8. THE Highlight SHALL contrast with the camera image with a ratio of at least 3:1 against its surroundings and SHALL NOT be shown by colour alone, but by an outline plus a text label (native-ux steering).
9. IF the mapped region of the target component is non-finite, THEN THE ui module SHALL draw no Highlight.
10. WHEN the current Step changes, THE ui module SHALL remove the previous Highlight in the same render.
11. THE Highlight SHALL NOT cover the text of the Checkpoint it asks the user to look for, where that text lies within the target component's region.

Verification: unit tests for criteria 1, 3 to 7, 9 and 10 on Recorded OCR snapshots (QE-1 for `CMP_NOT_VISIBLE`, owned by spec B and shown here). A source search for coordinate math in the ui module. Device: DT-G4-02 (AT-G4-02, correct component highlighted) and DT-ERR-04, device validation pending.

### Requirement 13: Step card, checkpoint prompt and completion

**User Story:** As a user, I want one clear step at a time in my language, with a way to retry or go back when the camera doesn't see the expected result, so that I never get stuck and never skip a step.

Source: PRODUCT.md (Guide mode and S1 steps 5 and 7), ARCHITECTURE.md §6 and §8 (`GD_CHECKPOINT_NOT_SEEN`), AT-G4-02, AT-G4-03, DT-ERR-05, native-ux steering, OQ-4, OQ-5.

#### Acceptance Criteria

1. WHILE the status is `running`, THE Step_Card SHALL show the current Step's instruction in the UI language, the position "Step n of N", and the Workflow title.
2. THE Step_Card SHALL show only instruction text taken from the MachineFixture, with no generated, inferred or runtime-translated text (D-008).
3. WHILE the status is `running` and the current Checkpoint is `text-visible`, THE Step_Card SHALL show what the camera is waiting for, using the Step's Expected result in the UI language.
4. WHEN the Guide reducer receives a number of consecutive accepted Guide observations with machine status `verified` and Checkpoint result `not-met` equal to the Checkpoint-not-seen limit, THE Guide reducer SHALL set the error `GD_CHECKPOINT_NOT_SEEN` and keep the current Step.
5. WHILE the error is `GD_CHECKPOINT_NOT_SEEN`, THE Step_Card SHALL show "Didn't see [expected result]. Check the machine." with the Step's Expected result inserted, a Retry control and a Back control.
6. WHEN the user taps Retry, THE Guide reducer SHALL clear the error, clear the Consecutive-match record and the not-seen count, and keep the current Step.
7. WHEN the user taps Back, THE Guide reducer SHALL move to the previous Step, clear the error, clear the Consecutive-match record and the not-seen count, and add no Transition proof of an advance.
8. WHILE the current Step is the first Step, THE Step_Card SHALL show no Back control.
9. THE Guide reducer SHALL NOT advance, skip or auto-complete a Step because of `GD_CHECKPOINT_NOT_SEEN` or because of Retry or Back.
10. WHILE the error is `GD_CHECKPOINT_NOT_SEEN`, WHEN two consecutive accepted Guide observations match the Checkpoint, THE Guide reducer SHALL advance as in Requirement 7 and clear the error.
11. WHILE the Checkpoint-not-seen count is counting, THE Guide reducer SHALL count only Guide observations with machine status `verified`, and SHALL reset the count on a `met` result, and SHALL ignore `cannot-tell` results.
12. THE guide module SHALL define the Checkpoint-not-seen limit as a Named threshold constant, set at G4 and recorded in `docs/DECISIONS.md` (OQ-4).
13. WHEN the status becomes `completed`, THE Guide_Screen SHALL show the completion text and a control that returns Guide to the Task_Picker.
14. THE Step_Card SHALL give every touchable element a touch target of at least 48 × 48 dp, an accessibilityRole and an accessibilityLabel in the UI language, and SHALL announce each new Step to Android accessibility services.
15. THE Step_Card SHALL lay out Hindi and Kannada instructions at the largest Android system font size without clipping controls or text.
16. THE Step_Card SHALL show Devanagari and Kannada text in the correct script, with no missing-glyph boxes and with marks above and below the line fully visible.

Verification: unit tests for criteria 4 to 11 and 13 and for the accessibility props of criterion 14. Device: DT-ERR-05 (`GD_CHECKPOINT_NOT_SEEN`, QE-2), DT-G4-02 for criteria 1, 13 and 16, device validation pending.

### Requirement 14: Interruption and backgrounding

**User Story:** As a user who switches to another app mid-task, I want Guide to come back safely, so that no step is skipped while I was away.

Source: AT-G4-08, DT-G4-06, ARCHITECTURE.md §6 (Guide step 5), D-019, OQ-6, OQ-7.

#### Acceptance Criteria

1. WHEN the OverlayKit_App goes to the background while the status is `running`, THE ui module SHALL send the interrupted event to the Guide reducer.
2. WHEN the Guide reducer receives an interrupted event while the status is `running`, THE Guide reducer SHALL set the status to `paused`, clear the Consecutive-match record and the not-seen count, keep the current Step, and set the error `GD_MACHINE_LOST`.
3. WHEN the OverlayKit_App returns to the foreground with the status `paused`, THE Guide_Screen SHALL show the paused text of Requirement 10, and THE Guide reducer SHALL resume only as in Requirement 10 (criterion 6), after a `verified` Guide observation.
4. THE Guide reducer SHALL NOT count any Guide observation captured before the interruption toward a Step after it.
5. IF the status was `completed`, `cancelled` or `idle` when the OverlayKit_App went to the background, THEN THE Guide reducer SHALL leave the status unchanged.
6. WHEN the OverlayKit_App returns to the foreground, THE ui module SHALL discard any still and Highlight that the Overlay lifetime rules of spec A discard, and SHALL NOT show a Highlight until a new `verified` MachineMatch arrives.
7. WHEN the user leaves Guide mode while the status is `running` or `paused`, THE ui module SHALL send a cancel event and the Guide reducer SHALL return to `idle` without a Transition proof of an advance (OQ-7).
8. THE ui module SHALL stop the machine-lost timer while the OverlayKit_App is in the background.

Verification: unit tests for criteria 2 to 5 and 7, and property tests that an interrupted event never advances a Step (Requirement 15). Device: DT-G4-06 (background 30 s, return, same Step or safe reset, no skipped Step), device validation pending (AT-G4-08).

### Requirement 15: Property-based tests for the reducer

**User Story:** As the owner, I want the reducer tested against thousands of random event orders, so that "exactly once, never on a timer" holds in cases nobody thought to write down.

Source: quality steering (Tests: Guide reducer), D-019, AT-G4-03, QUALITY-GATES.md.

#### Acceptance Criteria

1. THE Test_Suite SHALL include property tests that generate random sequences of Guide events (start, observation, confirm-manual, machine-lost, interrupted, retry, step-back, cancel, reset) for random valid Workflows.
2. FOR ALL generated sequences, THE Test_Suite SHALL check that the current Step index never increases by more than one for a single event.
3. FOR ALL generated sequences, THE Test_Suite SHALL check that every increase of the Step index is preceded by either two accepted, consecutive, distinct Guide observations with Checkpoint result `met` and machine status `verified` for the earlier Step, or a confirm-manual event on a `manual` Step.
4. FOR ALL generated sequences, THE Test_Suite SHALL check that the Transition proof list length equals the number of Step advances.
5. FOR ALL generated sequences, THE Test_Suite SHALL check that duplicating any Guide observation (same observation id or same frameId), or replaying an older one, leaves the Guide state equal to the state without the duplicate or replay.
6. FOR ALL generated sequences, THE Test_Suite SHALL check that inserting machine-lost, interrupted, retry or cancel events never increases the Step index.
7. FOR ALL generated sequences with no event of kind start for a `verified` MachineMatch, THE Test_Suite SHALL check that the status stays `idle`.
8. FOR ALL generated sequences, THE Test_Suite SHALL check that the Step index never exceeds the Workflow's last Step and never falls below the first, and that `completed` is reached only by advancing from the last Step.
9. FOR ALL generated sequences, THE Test_Suite SHALL check that a sequence containing no Guide observation with Checkpoint result `met` and no confirm-manual event never advances a Step.
10. THE Test_Suite SHALL check that the Guide reducer returns equal Guide states when the same sequence is replayed (determinism).
11. THE Test_Suite SHALL record the failing seed and the shrunk counterexample of any property failure in the test output.
12. THE Test_Suite SHALL derive its generated Guide observations from Recorded OCR snapshots by changing named fields, or from the fields of a Guide observation alone, and SHALL state the changed fields in the test.

Verification: `npm test` output with pass and fail counts. Needs the property-test library (see Dependencies); until the owner approves it, only the example-based tests of Requirements 7 to 14 can run.

### Requirement 16: Guide error states

**User Story:** As a user, I want a short, honest message for each Guide problem and a clear way out, so that I know whether to re-aim, retry or switch mode.

Source: ARCHITECTURE.md §8, CAPABILITY-MAP.md §5, QE-1, QE-2, QE-3, DT-G4-01, DT-G4-03, DT-G4-04, DT-ERR-04, DT-ERR-05.

#### Acceptance Criteria

1. THE guide module SHALL produce `GD_UNSUPPORTED`, `GD_MACHINE_LOST`, `GD_MACHINE_CHANGED`, `GD_CHECKPOINT_NOT_SEEN` and `GD_FIXTURE_INVALID`, and no other module SHALL produce them.
2. THE shared module SHALL define the five `GD_*` codes as listed in ARCHITECTURE.md §8, if spec A or B hasn't defined them.
3. THE ui module SHALL map each `GD_*` code to exactly one state and one text, with no code left unmapped:
   - `GD_UNSUPPORTED` to the Refusal_State (Requirement 5).
   - `GD_MACHINE_LOST` to the paused state (Requirement 10).
   - `GD_MACHINE_CHANGED` to the cancelled state (Requirement 10).
   - `GD_CHECKPOINT_NOT_SEEN` to the checkpoint prompt with Retry and Back (Requirement 13).
   - `GD_FIXTURE_INVALID` to a Workflow left out of the Task_Picker (Requirement 4).
4. THE guide module SHALL return every failure as a Result value or a Guide state error, and SHALL throw nothing across the module boundary.
5. THE Test_Suite SHALL include, for each of the five codes, a unit test that the guide module produces it and a unit test that the ui module maps it to its state (QE-1).
6. THE ui module SHALL show `CMP_NOT_VISIBLE` (spec B) as the prompt of Requirement 12, and the Test_Suite SHALL include a unit test of that mapping in the Guide_Screen.
7. WHEN G4 device testing runs, THE Device_Tester SHALL reach `GD_UNSUPPORTED`, `GD_MACHINE_LOST`, `GD_MACHINE_CHANGED`, `GD_CHECKPOINT_NOT_SEEN` and `CMP_NOT_VISIBLE` at least once on the Reference phone, and `GD_FIXTURE_INVALID` through a debug-only hook (QE-2).
8. WHERE the build is a debug build, THE OverlayKit_App SHALL provide a test hook that loads an invalid Workflow, and THE release bundle SHALL exclude it.
9. THE Guide_Screen SHALL show every state as text, or as an icon with text, and SHALL expose the state to Android accessibility services (QE-3).

Verification: `npm test` for criteria 1 to 6. Device: DT-G4-01, DT-G4-03, DT-G4-04, DT-ERR-04 and DT-ERR-05 (criterion 7), device validation pending.

### Requirement 17: Hidden Speak slot

**User Story:** As a developer of spec D, I want a reserved place for the Speak control that does nothing until speech exists, so that adding speech later changes no Guide logic.

Source: CAPABILITY-MAP.md §4.C and CM-2, D-014, ARCHITECTURE.md §5 (`ui` is the only wiring place), AT-G4-07 (spec D).

#### Acceptance Criteria

1. THE Step_Card SHALL contain a Speak_Slot.
2. WHILE no speech control is supplied to the Speak_Slot, THE Speak_Slot SHALL render nothing and take no space.
3. THE ui module SHALL NOT import the speech module in this spec.
4. THE Speak_Slot SHALL accept a control from spec D without a change to the Guide reducer or the Step_Card's props other than the control itself.
5. THE OverlayKit_App SHALL request no microphone permission and add no speech dependency in this spec.

Verification: unit test for criteria 1 and 2. Source search for the speech import. AT-G4-07 itself is verified in spec D.

### Requirement 18: No hidden fixture state and no runtime-generated steps

**User Story:** As a judge, I want proof that Guide reads the machine only through the camera and shows only authored steps, so that it can't be faking a demo.

Source: product steering (No hidden fixture state, Truthful capabilities), P6, D-008, D-009, AT-G4-06.

#### Acceptance Criteria

1. THE guide module SHALL learn the machine's state only from OcrResults passed in as Guide observations.
2. THE guide module SHALL make no network request and SHALL read no shared storage, deep link or device sensor for fixture state.
3. THE OverlayKit_App SHALL keep no timer that moves a Step, and SHALL use timers only for the Machine-lost timeout and for display.
4. THE guide module SHALL NOT call the locale module and SHALL NOT receive translated text for any Step.
5. THE ui module SHALL NOT pass a translation of recognized text into the Step_Card, the Highlight label or the checkpoint prompt.
6. THE Step_Card SHALL show Step text only in `en`, `hi` or `kn` from the MachineFixture, and where a Step lacks the UI language the Workflow loader SHALL have rejected the Workflow (Requirement 4).
7. THE OverlayKit_App SHALL describe Guide as supporting TM-01 only, in the UI language, wherever its capabilities are listed.
8. THE OverlayKit_App SHALL call Highlights 2D overlays anchored to the image, and SHALL NOT describe them as world tracking, SLAM, ARCore or ARKit.

Verification: source search for network, storage and locale imports in the guide module (static check in lint, Q4). Code review for criteria 3 and 5. Unit tests for criteria 4 and 6.

### Requirement 19: Module boundaries

**User Story:** As a developer, I want Guide built in the layers the architecture defines, so that no module reaches across a boundary.

Source: D-012, ARCHITECTURE.md §4, §5, architecture steering, QUALITY-GATES.md Q4, CAPABILITY-MAP.md §4.C.

#### Acceptance Criteria

1. THE guide module SHALL import only the components module, the geometry module and the shared module, through each module's `index.ts`.
2. THE components module SHALL import only the geometry module and the shared module, and SHALL hold the Screen matcher and the screens and workflows data.
3. THE ui module SHALL be the only module that wires the guide, components, geometry, ocr, capture and locale modules together.
4. THE ui module SHALL hold no rule that decides whether a machine is verified, whether a Checkpoint is met, or whether a Step advances.
5. THE geometry module SHALL be the only module that converts Image-space or Machine-space coordinates to View-space coordinates.
6. THE app routes in `src/app` SHALL stay thin and render ui screens only.
7. THE OverlayKit_App SHALL add no state-management library; Guide SHALL use the reducer through React state or `useReducer` in the ui module.
8. THE app code SHALL NOT import the backend module.
9. THE shared module SHALL hold the Guide types that other modules need (Guide event, Guide state, Guide observation, Transition proof) only if the ui module can't take them from the guide module's `index.ts`.

Verification: `npm run typecheck`, `npm run lint` with the boundary rule (Q4, once added), and code review.

### Requirement 20: Tests and evidence

**User Story:** As the owner, I want Guide covered by tests on recorded data and a device record, so that a passing gate reflects checked behaviour.

Source: quality steering (Tests, Never, Real-device gate), QUALITY-GATES.md (QE-1, QE-2, QE-3, G4), ARCHITECTURE.md §12.

#### Acceptance Criteria

1. THE Test_Suite SHALL give each pure function in the guide module (Workflow loader, observation evaluation, Guide reducer), the components module (`matchScreen`, Checkpoint result derivation, fixture validation of screens and workflows) at least one unit test.
2. THE Test_Suite SHALL use Recorded OCR snapshots from the test-fixtures folder as the input for every test that needs OCR output, and SHALL NOT use invented OCR output.
3. IF a test needs a case that recorded captures can't produce, THEN THE Test_Suite SHALL derive that case from a Recorded OCR snapshot by changing named fields, and state the changed fields in the test.
4. THE Test_Suite SHALL include, for each `GD_*` code and for `CMP_NOT_VISIBLE` in the Guide_Screen, a unit test that the owning module produces it and a unit test that the ui module maps it to its state (QE-1).
5. THE Test_Suite SHALL include, for each Named threshold constant (Machine-lost timeout, the number of consecutive matches, Checkpoint-not-seen limit, the Screen matcher constants), a unit test that pins its value and a unit test of behaviour on both sides of the threshold.
6. THE Test_Suite SHALL NOT delete, skip, weaken or re-snapshot any test to pass.
7. WHEN a bug in the reducer is fixed, THE Test_Suite SHALL receive a failing test for it before the fix (quality steering).
8. WHEN G4 device testing runs, THE Device_Tester SHALL record each DT-G4 and DT-ERR result as PASSED, FAILED or NOT TESTED in `docs/DEVICE-TESTS.md` with commit, variant, device and date, and SHALL claim no result for a test that wasn't run.
9. THE project SHALL add the new Screen image rows and the Guide tests for the Screen images to `docs/DEVICE-TESTS.md` before G4 device testing starts, if the existing rows don't cover them.

Verification: `npm test` output with pass and fail counts; device records in `docs/DEVICE-TESTS.md`.

### Requirement 21: G4 device acceptance

**User Story:** As the owner, I want G4 judged on the Reference phone at TM-01, so that Guide is trusted only after it has worked at a machine.

Source: QUALITY-GATES.md G4, DEVICE-TESTS.md (DT-G4-01 to DT-G4-04, DT-G4-06, DT-ERR-04, DT-ERR-05), QE-2, RC-1, D-029, D-031, owner Q4.

Every criterion here is device-only and is "device validation pending". A "Pass" in this section means a PASSED record in `docs/DEVICE-TESTS.md`. Release behaviour is judged on a release build.

#### Acceptance Criteria

1. WHEN DT-G4-01 runs (NEG-01 to NEG-10 shown as images, Guide opened), THE OverlayKit_App SHALL show the Refusal_State with Translate and Explore on every item, and show no Step (AT-G4-01).
2. WHEN DT-G4-02 runs (TM-01, target `kn`, the workflow run to the end), THE OverlayKit_App SHALL highlight each Step's target on the correct component, advance each `text-visible` Step exactly once after the checkpoint is seen in two consecutive observations, advance each `manual` Step only on Done, and end at the completion text (AT-G4-02, AT-G4-03).
3. WHEN DT-G4-03 runs (mid-workflow, camera pointed away for longer than the Machine-lost timeout, then back), THE OverlayKit_App SHALL show the paused state and SHALL resume the same Step only after TM-01 is identified again (AT-G4-04).
4. WHEN DT-G4-04 runs (mid-workflow, camera pointed at NEG-01), THE OverlayKit_App SHALL cancel the Workflow (AT-G4-05).
5. WHEN DT-G4-06 runs (mid-workflow, app in the background for 30 s, then back), THE OverlayKit_App SHALL resume at the same Step or reset safely, and SHALL NOT skip a Step (AT-G4-08).
6. WHEN DT-ERR-04 runs (TM-01, the target component kept out of frame at its Step), THE OverlayKit_App SHALL show the `CMP_NOT_VISIBLE` prompt and no Highlight (QE-2).
7. WHEN DT-ERR-05 runs (TM-01, a `text-visible` Step, the action not performed), THE OverlayKit_App SHALL show `GD_CHECKPOINT_NOT_SEEN` and SHALL NOT advance (QE-2).
8. WHEN the G4 device tests run, THE Device_Tester SHALL record that the step text is shown in `en`, `hi` and `kn`, and that the `hi` and `kn` text carries the status `unreviewed` in the fixture (D-031).
9. IF any Step is shown for a machine that isn't `verified`, THEN THE project SHALL block release until it is fixed (QUALITY-GATES.md G4 stop condition).

Verification: PASSED records per criterion in `docs/DEVICE-TESTS.md`. Until they exist, G4 isn't claimed to pass.

## Open Questions

Each item below is **pending owner decision**. The criteria use the recommended default until the owner decides.

### OQ-1: Observations from stills or from live frames

- **Conflict:** D-019 and ARCHITECTURE.md §6 say a step advances after "two consecutive distinct observations". D-011 says the baseline is freeze-frame, with live mode kept only if AT-G1-06 passes. With stills only, each observation needs a capture, so Guide would need two taps or an automatic re-capture. The docs don't say which.
- **Sources:** D-011, D-019, ARCHITECTURE.md §6 and §7, QUALITY-GATES.md AT-G1-06.
- **Recommended default:** Guide takes observations from a loop of automatic still captures with OCR (each a distinct frame, no live overlays), and uses live frames only if spec A ships live mode. Either way the reducer sees the same Guide observation type. The capture rate is a Named threshold constant set at G4.
- **Used by:** Requirements 7, 8, 10 and 12.

### OQ-2: TM-01 form and Screen images

- **Resolved by D-029:** the owner chose option (b). TM-01 is a printed panel plus one screen image per Screen, shown passively on an iPad. Option (c), a kiosk simulator, was rejected. FIXTURE.md fixes the Screens S01 to S06 and the workflow steps W1 to W6.
- **Sources:** PRODUCT.md (TM-01), D-022, D-029, D-032, `test-fixtures/tm-01/FIXTURE.md`, CAPABILITY-MAP.md §4.C.
- **Remaining:** the final images don't exist, the generator and date are `TBD`, and every box is DRAFT until measured. The Screen identifying texts and the device tests wait for them.
- **Used by:** Requirements 1, 2 and 21.

### OQ-3: What counts as "a different machine"

- **Conflict:** `GD_MACHINE_CHANGED` triggers when "a different machine is identified". The catalogue holds only TM-01 (D-017), so no other machine can be `verified`. A negative-set machine returns `none`, and DT-G4-04 expects cancellation when the camera points at NEG-01.
- **Sources:** ARCHITECTURE.md §6 (Guide step 5) and §8, AT-G4-05, DT-G4-04, Requirement 10 (criteria 8, 12 and 13).
- **Recommended default:** a `none` or `ambiguous` observation pauses through the machine-lost timeout, and cancels (`GD_MACHINE_CHANGED`) when the Machine-lost timeout passes while the observations show readable text that matches no TM-01 Anchor, and no `verified` observation arrived. Otherwise the pause is `GD_MACHINE_LOST`. The distinction and its constants are set at G4. This is an interpretation of AT-G4-05 and needs the owner's decision, because Requirement 10 as written (criteria 8 and 12) cancels only on a `verified` match for another machine id and so would leave DT-G4-04 unsatisfiable.
- **Used by:** Requirement 10 and Requirement 21 (criterion 4).

### OQ-4: When `GD_CHECKPOINT_NOT_SEEN` appears

- **Conflict:** ARCHITECTURE.md §8 gives the trigger as "Expected result not observed" but no limit.
- **Sources:** ARCHITECTURE.md §8, DT-ERR-05.
- **Recommended default:** a count of consecutive `not-met` observations on a `verified` machine, as a Named threshold constant set at G4 and recorded in `docs/DECISIONS.md`. A time limit is not used, so the reducer needs no clock.
- **Used by:** Requirement 13.

### OQ-5: Component name for the prompts

- **Conflict:** the prompt "Point the camera at the [component]" needs a component name. ARCHITECTURE.md §10 gives components an id and a kind, but no name.
- **Sources:** ARCHITECTURE.md §8 and §10, spec B Requirement 20.
- **Recommended default:** spec B's fixture holds a name for each component in `en`, `hi` and `kn`, reviewed with the Explanations. If B doesn't, this spec adds the field.
- **Used by:** Requirements 12 and 13.

### OQ-6: Backgrounding behaviour

- **Conflict:** AT-G4-08 allows "same step or safe reset". D-019 and the architecture require resuming only after re-identification.
- **Sources:** AT-G4-08, ARCHITECTURE.md §8 (`GD_MACHINE_LOST`).
- **Recommended default:** pause at the same Step with the error `GD_MACHINE_LOST`, require a `verified` observation to resume, and discard the Consecutive-match record. A reset is not used.
- **Used by:** Requirement 14.

### OQ-7: Leaving Guide mode

- **Conflict:** the docs don't say what happens to a running workflow when the user switches mode or presses Android back.
- **Sources:** PRODUCT.md (Modes), native-ux steering (back behaviour).
- **Recommended default:** switching mode or pressing back cancels the workflow and returns Guide to `idle`. Starting again begins at the first Step.
- **Used by:** Requirement 14.

### OQ-8: Property-test library

- **Conflict:** the quality steering requires property tests for the reducer and G0 was to choose the library. No library is in `package.json`, and a new dependency needs owner approval with a cited compatibility check.
- **Sources:** quality steering, stack steering ("Adding a dependency").
- **Recommended default:** the owner approves fast-check as a dev dependency, after the agent checks its Jest 30 and Node support. If spec A has already added one, this spec uses it.
- **Used by:** Requirement 15 and Requirement 20.

### OQ-9: Where the workflow types and loader live

- **Conflict:** ARCHITECTURE.md §10 puts the MachineFixture type in one place, while CAPABILITY-MAP.md §4 gives the fixture data to the components module and the Workflow loader to the guide module. The guide module may import only components, geometry and shared.
- **Sources:** ARCHITECTURE.md §4, §5 and §10, CAPABILITY-MAP.md §4.C and CM-1.
- **Recommended default:** the components module owns the typed data and exports the `workflows` and `screens` types. The guide module owns the Workflow loader that validates them and the reducer that runs them.
- **Used by:** Requirements 1, 4 and 19.
### OQ-10: Documents that still carry the old reviewer wording (D-031)
- **Conflict:** PRODUCT.md "verified machine" item 3 requires a fluent review of `hi` and `kn` text, and ARCHITECTURE.md §10 (`review` field of the fixture type, `GD_FIXTURE_INVALID` rejecting a workflow with no reviewer) says the same. D-031 allows the status `unreviewed`. QUALITY-GATES.md AT-G4-06 may carry the same wording. Same conflict as spec 02 OQ-11.
- **Sources:** D-031 (Consequences), PRODUCT.md "verified" item 3, ARCHITECTURE.md §10, spec 02 OQ-11.
- **Recommended default:** this spec follows D-031 now. The owner confirms and PRODUCT.md, ARCHITECTURE.md §10 and QUALITY-GATES.md are updated in a separate change. Until then the docs win on conflict (product steering) and this conflict stays flagged here.
- **Used by:** Requirements 1, 4 and 20.

## Dependencies

- **Spec A (`camera-ocr-geometry`):** `FrameRef`, `OcrResult`, the Overlay_Layer and its lifetime rules, the Cover transform, and the visibility functions of the geometry module must be merged. AT-G1-02 must pass.
- **Spec B (`translation-explore`):** `MachineMatch` and `identifyMachine`, `locateComponents`, the MachineFixture's `identification` and `components` sections, the Fixture validator, `t(key)`, the Settings route and the Explore mode. AT-G3-01 and AT-G3-02 must pass on the phone first, because a false match makes Guide unsafe (CAPABILITY-MAP.md §4.C).
- **Spec D (`native-experience-and-release`):** the `speech` module and the Speak control. This spec ships only the hidden slot (CM-2). AT-G4-07 belongs to D.
- **Owner Q2 (TM-01 form):** answered by D-029 (printed panel plus screen images on an iPad). The final images, the generator and date, and measured boxes are still missing. See OQ-2.
- **Owner Q4 (reference phone):** not named. No phone is connected, so G0 build gate B1 hasn't run. Every device criterion is "device validation pending".
- **Owner Q5 (hi and kn reviewers):** none named, and none planned (D-031). `hi` and `kn` content ships as `unreviewed` and is disclosed as such. See OQ-10.
- **Dependency needing owner approval before install:** a property-test library (fast-check candidate). See OQ-8.
- **Proposed decisions:** D-008, D-009 (Accepted, contract), D-011, D-012, D-014, D-017, D-019 and D-020 are Proposed or Accepted as noted in `docs/DECISIONS.md`. These requirements assume them.
- **Static gates:** the module-boundary lint rule (Q4) isn't added, so Requirement 19 has no automatic check yet.
- **Recorded OCR snapshots:** none exist yet. Tests that need OCR input wait for the first snapshot export on the Reference phone (spec A), including snapshots of each Screen image.
- **Named threshold values to set at G4:** Machine-lost timeout (proposed 3 s), Checkpoint-not-seen limit, the Screen matcher constants, and the capture rate (OQ-1). Each is recorded in `docs/DECISIONS.md` before the related device measurements.
- **Stop condition:** any Step shown for a machine that isn't `verified` blocks release (QUALITY-GATES.md G4).
