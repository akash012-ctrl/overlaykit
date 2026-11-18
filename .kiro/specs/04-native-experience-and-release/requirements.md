# Requirements Document

Status: **draft.** The owner asked for all specs to be generated end to end, so this document was written without a review pause. Open questions OQ-1 to OQ-9 use their recommended defaults until the owner decides them. Generating this document is not owner approval (CAPABILITY-MAP.md §7).

## Introduction

This spec covers capability D in `docs/CAPABILITY-MAP.md` (§4.D and §5): the final native experience and the release. It delivers AT-G4-07 (voice), build gate B2, the release checks RC-1 to RC-6, QE-1 and QE-2 for `SP_NO_VOICE` and `SP_FAILED`, and the device tests DT-ERR-01 to DT-ERR-05, DT-RC-01 and DT-RC-02, plus the physical-device protocol PD-01 to PD-09 from the `physical-device-qa` skill.

What this spec adds:

1. Final navigation: the camera-first index route with the Translate, Explore and Guide switcher, the completed Settings route, Android back behaviour and the portrait lock. No new routes.
2. The `speech` module (`hasVoice`, `speak`, `stop`) over the platform text-to-speech engine (D-014), and the Speak control in the Guide Step_Card (CM-2).
3. The accessibility pass defined in `.kiro/steering/native-ux.md`.
4. Physical QA on the Reference phone, recorded in `docs/DEVICE-TESTS.md`.
5. The release: a signed APK built locally with Gradle and attached to a GitHub Release (D-002, D-018), a README, a LICENSE (D-021), the static checks Q7, Q8 and Q9, the demo video, the Devpost text, `docs/kiro-evidence.md` and the RC commit record in `docs/build-log.md`.

Sources, in order of precedence: `docs/PRODUCT.md` (rules P1 to P8, "Not built", scenario S1 and S1-N), `docs/DECISIONS.md` (D-xxx), `docs/ARCHITECTURE.md` (§8 error states, §11 threats), `docs/QUALITY-GATES.md`, `docs/DEVICE-TESTS.md`, `docs/CAPABILITY-MAP.md`, `.kiro/steering/native-ux.md`, `.kiro/steering/hackathon.md`, `.kiro/skills/physical-device-qa/SKILL.md`, and the workspace steering files. Where these sources conflict, the conflict is listed under Open Questions with a recommended default.

**Truthful wording.** Everything this spec produces that describes the app (README, video script, Devpost text, in-app text) states only capabilities recorded as PASSED in `docs/DEVICE-TESTS.md`. It does not claim iOS support, real-world machine support, Kannada camera reading, world tracking, or accuracy beyond measured results.

**Dependencies that need owner approval before they are added** (stack steering, "Adding a dependency"):

- `expo-speech` (candidate, D-014). Gate task: AT-G4-07. Before install the agent checks the official Expo docs for SDK 58 and React Native 0.88 New Architecture support, cites the source, installs with `npx expo install expo-speech`, then runs `npx expo install --check` and `npx expo-doctor`. This document does not install it.
- A LICENSE file needs the owner's choice of license and copyright holder (owner Q9, D-021). It is not a package.

No dependency is added by writing this document.

**Relationship to specs A, B and C.**

- Spec A supplies the Camera_Screen at the index route, the Overlay_Layer, capture, OCR and geometry.
- Spec B supplies `t(key)`, the Settings route with its language section and the OpenRouter key section, the first-run privacy note, and the Explore mode.
- Spec C supplies the Guide mode, `GuideState`, the Step_Card with a hidden Speak_Slot (CM-2), and the Guide announcements' source data.

**Out of scope:** EAS Build, `eas.json`, store listings (App Store, Play Store), iOS builds and iOS device validation (D-002, D-003), a web or desktop build, speech recognition or voice commands, analytics, login, a new route without owner approval, and any change to a gate threshold.

**Thresholds.** Numeric thresholds copied from QUALITY-GATES.md are *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Where the docs give no number (battery drop, temperature, speech start time, touch-target counts beyond 48 dp), this document invents none. Those values are recorded as measurements, not pass limits.

**Device criteria.** A criterion tagged "Device" is verified only on the Reference phone, with a PASSED record in `docs/DEVICE-TESTS.md` that names the build commit, variant, device and date. Until that record exists, its status is "device validation pending". Performance results come from a Release build only. On the date of writing, no phone is connected, so every device criterion is pending. The owner deferred Q4 (D-031), so every device and release criterion in this document stays "device validation pending" until the phone is connected and a PASSED record exists.

## Glossary

- **OverlayKit_App**: the Expo Android app in this repository.
- **Camera_Screen**: the `ui` screen at the index route (spec A). It shows the preview or the shown still, the mode switcher and the Overlay_Layer.
- **Mode_Switcher**: the control on the Camera_Screen that selects Translate, Explore or Guide.
- **Settings_Screen**: the `ui` screen at the Settings route (spec B creates it, this spec completes it).
- **Privacy_Note**: the one-screen first-run note (spec B, CM-5).
- **Honest_Limits_Section**: the part of the Settings_Screen that states what the app cannot do.
- **Step_Card**: the Guide panel that shows the current step (spec C).
- **Speak_Control**: the control in the Step_Card that reads the current step aloud.
- **Speak_Slot**: the reserved place in the Step_Card where the Speak_Control goes (spec C, CM-2).
- **Speech_Engine**: the platform text-to-speech engine reached through `expo-speech`.
- **Voice**: an installed Speech_Engine voice for one locale (`en`, `hi`, `kn`).
- **speech module**: `src/modules/speech`. Owns voice availability, speak and stop. Imports only `shared`.
- **ui module**: `src/modules/ui`. The only module that wires other modules together.
- **locale module**: `src/modules/locale`. Owns `t(key)` and the language settings.
- **shared module**: `src/modules/shared`. Core types, `Result` and error codes.
- **Reference phone**: the Android phone named under owner question Q4 in `tasks/todo.md`.
- **Device_Tester**: the person who runs the `docs/DEVICE-TESTS.md` cases on the Reference phone.
- **Fluent_Reviewer**: a fluent speaker of Hindi or Kannada who reviews text (owner Q5). None is named (D-031), so all Hindi and Kannada text is `unreviewed`.
- **QA_Agent**: the Kiro agent that prepares checklists, runs read-only `adb` commands and records results under the `physical-device-qa` skill. It cannot see the camera image or the screen.
- **Result_Category**: one of PASSED, FAILED or NOT TESTED, as defined in the `physical-device-qa` skill.
- **Release_APK**: the signed Android package built locally with Gradle in the release variant.
- **GitHub_Release**: a release on the public GitHub repository that carries the Release_APK.
- **Keystore**: the signing key file for the Release_APK. It is kept outside git.
- **README**: `README.md` at the repository root.
- **LICENSE_File**: `LICENSE` at the repository root, in a form GitHub detects.
- **Kiro_Evidence_Log**: `docs/kiro-evidence.md`, with dated entries of real Kiro use.
- **Build_Log**: `docs/build-log.md`.
- **RC_Commit**: the commit that the release candidate checks RC-1 to RC-6 are run against.
- **Demo_Video**: the YouTube video submitted to the hackathon.
- **Devpost_Text**: the submission description, category and Kiro write-up.
- **TM-01**: the verified ticket machine fixture (PRODUCT.md). It is a first-party simulated machine: a printed panel plus screen images shown on an iPad (D-029). The artwork may be AI-generated, and every word on it is added by the team (D-032).
- **TR_NOT_CONFIGURED state**: the Translate state that shows the original text with "Translation not available". With ML Kit on-device translation only (D-030), it appears for a language pair that fails AT-G2-02.
- **Declared permissions**: the permissions in the merged Android manifest after `npx expo prebuild`.
- **Outside tester**: a person outside the project team who installs the Release_APK on their own Android phone (RC-5).
- **Debug build / Release build**: the builds produced by build gates B1 and B2.

## Requirements

### Requirement 1: Camera-first index route and mode switcher

**User Story:** As a user at a machine, I want the app to open straight to the camera with the three modes within reach, so that I can start translating without navigating.

Source: P1, P2, native-ux steering ("Screens and navigation"), CAPABILITY-MAP.md §4.D and CM-4, ARCHITECTURE.md §3.

#### Acceptance Criteria

1. WHEN the OverlayKit_App starts and the first-run steps are complete, THE OverlayKit_App SHALL show the Camera_Screen at the index route.
2. THE Mode_Switcher SHALL offer exactly three modes: Translate, Explore and Guide.
3. THE Mode_Switcher SHALL sit at the bottom of the Camera_Screen, within thumb reach on a 360 dp wide portrait screen.
4. WHEN the user selects a mode, THE Camera_Screen SHALL show that mode's view and mark that mode as selected with text or an icon plus text, not colour alone.
5. THE `src/app` route files SHALL render a `ui` screen and SHALL hold no logic.
6. THE OverlayKit_App SHALL contain exactly two routes: the index route and the Settings route.
7. IF a change adds a route other than the index and Settings routes, THEN THE project SHALL obtain owner approval before the route is merged.
8. THE `src/app` directory SHALL contain no `.web.tsx`, `+html.tsx` or `+api.ts` file.
9. WHEN the user opens the Settings_Screen from the Camera_Screen and returns, THE Camera_Screen SHALL show the previously selected mode.

Verification: unit tests for the Mode_Switcher state and the route list; file search for criterion 8. Device: DT-RC-01 (S1 run), device validation pending.

### Requirement 2: Settings completed

**User Story:** As a user, I want one Settings screen with language, voice, the privacy note and the app's honest limits, so that I know what the app does with my data and what it can't do.

Source: P3, P5, P7, CAPABILITY-MAP.md §4.D, native-ux steering, D-005, D-014, D-028, PRODUCT.md ("Not built").

#### Acceptance Criteria

1. THE Settings_Screen SHALL keep the target-language section and the OpenRouter key section delivered by spec B, with their behaviour unchanged.
2. THE Settings_Screen SHALL include a voice section that lists, for each of `en`, `hi` and `kn`, whether a Voice is available on the device.
3. WHEN no Voice is available for a locale, THE Settings_Screen SHALL show a note for that locale that tells the user to install a voice in system settings (`SP_NO_VOICE`).
4. THE Settings_Screen SHALL include a way to read the Privacy_Note again, with the text from spec B.
5. THE Honest_Limits_Section SHALL state in the UI language that Kannada text in the camera image can't be read.
6. THE Honest_Limits_Section SHALL state in the UI language that step-by-step Guide works only for the verified machine TM-01.
7. THE Honest_Limits_Section SHALL state in the UI language that translation of recognized text runs on the phone with ML Kit, and that the first use of a language pair needs a network to download its model of about 30 MB (D-030).
8. THE Honest_Limits_Section SHALL state in the UI language that overlays are 2D labels placed on text in the image, and not world tracking.
9. THE Settings_Screen SHALL provide no control for login, account, analytics, ads or tracking.
10. THE Settings_Screen SHALL take all user-facing strings from `t(key)` in `en`, `hi` and `kn`.
11. THE Settings_Screen SHALL give each touchable an `accessibilityRole` and an `accessibilityLabel` in the UI language.
12. THE Honest_Limits_Section SHALL state in the UI language that the Hindi and Kannada text in the app is unreviewed by fluent speakers (D-031).

Verification: unit tests that every key used by the Settings_Screen exists in all three locales; render tests for criteria 2 to 9 and 12. The `hi` and `kn` strings are marked `unreviewed` because no Fluent_Reviewer is named (D-031). Device: PD-07, device validation pending.

### Requirement 3: Android back behaviour and portrait lock

**User Story:** As a user, I want the Android back button to behave predictably and the screen to stay upright, so that I don't lose my place or get a sideways camera view.

Source: native-ux steering, PRODUCT.md ("Not built": landscape), CAPABILITY-MAP.md §4.D, PD-04.

#### Acceptance Criteria

1. THE OverlayKit_App SHALL declare portrait as its only orientation in `app.json`.
2. WHEN the Settings_Screen is shown and the user presses the Android back button, THE OverlayKit_App SHALL return to the Camera_Screen.
3. WHEN the Camera_Screen is shown with a still displayed and the user presses back, THE Camera_Screen SHALL dismiss the still and return to the preview.
4. WHEN the Camera_Screen shows the preview with no still and the user presses back, THE OverlayKit_App SHALL leave the app by the system default.
5. WHEN Guide is running and the user presses back, THE OverlayKit_App SHALL apply the leaving-Guide behaviour defined in spec C (OQ-7 there) before any other back action.
6. WHILE the system auto-rotate setting is on and the phone is held in landscape, THE OverlayKit_App SHALL keep a portrait layout.
7. THE OverlayKit_App SHALL make no native-folder edit by hand. Orientation SHALL be set through `app.json` or a config plugin, and `android/` and `ios/` SHALL stay gitignored.

Verification: unit test or config check of `app.json` for criterion 1; component tests for criteria 2 to 5. Device: PD-04 for criterion 6, device validation pending.

### Requirement 4: Speech module

**User Story:** As a user who reads Hindi or Kannada better than text on a small screen, I want to hear a step read aloud, so that I can follow it while looking at the machine.

Source: P3, D-014, ARCHITECTURE.md §4 (speech), §8 (`SP_NO_VOICE`, `SP_FAILED`), AT-G4-07, QE-1, T10.

#### Acceptance Criteria

1. THE speech module SHALL expose `hasVoice(locale)`, `speak(text, locale)` and `stop()` through its `index.ts`.
2. THE speech module SHALL import only the `shared` module and the Speech_Engine adapter.
3. THE speech module SHALL keep the Speech_Engine behind an interface, so that app behaviour depends on the interface and not on `expo-speech` (architecture steering, "Provider adapters").
4. THE speech module SHALL convert Speech_Engine types to `shared` types at its boundary and SHALL NOT let vendor types leave the module.
5. WHEN `hasVoice(locale)` is called, THE speech module SHALL report whether a Voice for that locale is installed, using the Speech_Engine's voice list at call time.
6. IF no Voice is installed for the locale, THEN THE speech module SHALL return `SP_NO_VOICE` from `speak`.
7. IF the Speech_Engine reports an error during playback, THEN THE speech module SHALL return `SP_FAILED`.
8. WHEN `stop()` is called, THE speech module SHALL stop any playback in progress.
9. WHEN `speak` is called while playback is in progress, THE speech module SHALL stop the earlier playback before it starts the new one.
10. THE speech module SHALL return failures as `Result` values and SHALL throw nothing across its boundary.
11. THE speech module SHALL request no microphone permission and SHALL implement no speech recognition (D-014).
12. THE speech module SHALL use no network call of its own.
13. THE speech module SHALL speak only text it is given, and SHALL generate, translate or alter no text.
14. THE `shared` module SHALL define `SP_NO_VOICE` and `SP_FAILED`, each produced by the speech module only.

Verification: unit tests with a fake Speech_Engine for criteria 1 to 10 and 13 (QE-1 for `SP_NO_VOICE` and `SP_FAILED`); a source search for microphone and network use for criteria 11 and 12; boundary lint (Q4) once added. Device: DT-G4-05 and DT-ERR-02 (`SP_FAILED`), device validation pending. The `expo-speech` install needs owner approval (OQ-1).

### Requirement 5: Speak control in the Guide step card

**User Story:** As a user following Guide, I want a Speak button on each step only when my language can really be spoken, so that I never tap a control that does nothing.

Source: CM-2, AT-G4-07, D-014, ARCHITECTURE.md §8 (`SP_NO_VOICE`, `SP_FAILED`), spec C (Speak_Slot), DT-G4-05.

#### Acceptance Criteria

1. WHERE `hasVoice` returns true for the current UI language, THE Step_Card SHALL show the Speak_Control in the Speak_Slot.
2. IF `hasVoice` returns false for the current UI language, THEN THE Step_Card SHALL hide the Speak_Control and SHALL leave the step text visible.
3. WHEN the user taps the Speak_Control, THE ui module SHALL pass the current step's instruction text in the current UI language to `speak`.
4. THE ui module SHALL read the text for the Speak_Control from the Guide state's current step, and SHALL use no other text source.
5. IF `speak` returns `SP_FAILED`, THEN THE Step_Card SHALL show a short notice, keep the step text visible and keep the Speak_Control available for retry.
6. WHEN the Guide step changes, THE ui module SHALL call `stop()`.
7. WHEN the workflow is paused, cancelled or completed, or the app moves to the background, THE ui module SHALL call `stop()`.
8. WHEN the user taps the Speak_Control while the step is being read, THE ui module SHALL call `stop()`.
9. THE Speak_Control SHALL have an `accessibilityRole` of button, an `accessibilityLabel` in the UI language, and a touch target of at least 48 × 48 dp.
10. THE Speak_Control SHALL NOT cause a step to advance.
11. THE Speak_Control SHALL appear and disappear without a crash when the user installs or removes a voice while the app is running and the app next re-checks `hasVoice`.

Verification: component tests with a fake speech module for criteria 1 to 10. Device: DT-G4-05 with and without a Kannada voice (AT-G4-07), device validation pending.

### Requirement 6: Accessibility roles, labels and touch targets

**User Story:** As a user who relies on a screen reader or has large fingers, I want every control labelled and large enough, so that I can use the app without guessing.

Source: native-ux steering ("Accessibility"), P3, CAPABILITY-MAP.md §4.D.

#### Acceptance Criteria

1. THE ui module SHALL give every touchable an `accessibilityRole` and an `accessibilityLabel` in the current UI language.
2. THE ui module SHALL expose the text of each tappable overlay to the accessibility service.
3. THE ui module SHALL give every touchable a touch target of at least 48 × 48 dp.
4. THE ui module SHALL leave system font scaling on, and SHALL NOT disable it on any text element.
5. WHILE the system font size is set to its largest value, THE Camera_Screen, the Step_Card and the Settings_Screen SHALL keep every control visible and reachable, with no clipped text.
6. THE ui module SHALL use whole-sentence `t(key)` keys with placeholders and SHALL NOT join translated fragments.
7. THE ui module SHALL contain no hard-coded user-facing text.

Verification: render tests that query all touchables for criteria 1 and 3, a lint or search check for criterion 7, and a key-coverage test. Device: PD-07 and a largest-font-size run, device validation pending.

### Requirement 7: Announcements and reduced motion

**User Story:** As a screen-reader user, I want to hear when the mode or the Guide step changes, and as a user sensitive to motion, I want static highlights, so that the app is usable for me.

Source: native-ux steering ("Accessibility"), CAPABILITY-MAP.md §4.D, spec C (Highlight).

#### Acceptance Criteria

1. WHEN the user changes the mode, THE ui module SHALL call `AccessibilityInfo.announceForAccessibility` with the name of the new mode in the UI language.
2. WHEN a new Guide step becomes current, THE ui module SHALL call `AccessibilityInfo.announceForAccessibility` with the step's instruction text in the UI language.
3. WHEN the Guide workflow pauses, cancels or completes, THE ui module SHALL announce that state in the UI language.
4. THE ui module SHALL NOT announce the same Guide step more than once for one transition.
5. WHILE `AccessibilityInfo.isReduceMotionEnabled()` returns true, THE ui module SHALL draw the Guide Highlight and any other emphasis as a static outline, with no pulsing or animation.
6. WHEN the reduce-motion setting changes while the app is running, THE ui module SHALL apply the new setting without a restart.
7. THE ui module SHALL show each label's state (translated, pending, failed, unsupported) as text or icon plus text, and SHALL NOT rely on colour alone.

Verification: component tests with a mocked `AccessibilityInfo` for criteria 1 to 6. Device: a TalkBack run and a reduce-motion run, device validation pending (no DT ID exists for these yet, OQ-7).

### Requirement 8: Legibility in bright light and script rendering

**User Story:** As a user in sunlight reading Hindi or Kannada, I want overlays and controls I can read, so that the app works outdoors.

Source: native-ux steering ("Readable overlays", "Localization", "Small devices and contrast"), PD-07, DT-G2-01, condition L1 in DEVICE-TESTS.md.

#### Acceptance Criteria

1. THE ui module SHALL draw overlay text on a solid or near-opaque backing, with a text-to-backing contrast ratio of at least 4.5:1.
2. THE ui module SHALL draw overlay text at 14 sp or larger and SHALL truncate with an ellipsis when it doesn't fit, with a tap to show the full text.
3. THE ui module SHALL use dark translucent bars with white text for the camera controls.
4. THE ui module SHALL use system fonts and SHALL NOT force a Latin-only custom font.
5. THE ui module SHALL set no fixed height on text containers and SHALL allow text to wrap.
6. WHILE the target or UI language is Hindi or Kannada, THE ui module SHALL show no missing-glyph boxes and no clipped marks above or below the line.
7. THE ui module SHALL respect the safe-area insets on all four edges.
8. WHEN the Device_Tester runs Translate and Explore under condition L1, THE Device_Tester SHALL record whether overlay text and controls were legible, as PASSED or FAILED.

Verification: a unit test of the contrast calculation for the colour pairs in use (criterion 1); render tests with the longest `hi` and `kn` strings (criteria 5 and 6 in layout terms). Device: PD-07 and DT-G2-01 for criterion 6, and an L1 run for criterion 8. Device validation pending.

### Requirement 9: Physical QA protocol and records

**User Story:** As the owner, I want every device claim backed by a record that says who saw what on which build, so that I can trust the release evidence.

Source: quality steering ("Real-device gate", "Never"), `physical-device-qa` skill, DEVICE-TESTS.md, CAPABILITY-MAP.md §4.D.

#### Acceptance Criteria

1. THE project SHALL fill in the Reference device table in `docs/DEVICE-TESTS.md` before the first physical QA session.
2. WHEN a QA session starts, THE QA_Agent SHALL record the date, the output of `git rev-parse --short HEAD`, the build variant, the phone model and Android version, the tester name and the conditions.
3. THE QA_Agent SHALL record each result as PASSED, FAILED or NOT TESTED, using the definitions in the `physical-device-qa` skill.
4. IF `adb devices` lists no phone, THEN THE QA_Agent SHALL record every device result as NOT TESTED and SHALL state "device validation pending".
5. THE QA_Agent SHALL record visual and physical results only as reported by the named Device_Tester, and SHALL record `adb` output only as what the command showed.
6. THE QA_Agent SHALL NOT report output from a command it did not run.
7. THE project SHALL measure performance only on a Release build.
8. THE project SHALL treat unit tests, emulator runs and e2e emulator runs as evidence for their own gates only, and not for device results.
9. THE project SHALL append each session to `docs/DEVICE-TESTS.md` under "Results" using the session template, and SHALL keep screenshots under `docs/device-results/<date>/`.
10. WHEN a case is partly passed (for example two of three attempts), THE QA_Agent SHALL record it as FAILED.
11. THE project SHALL NOT write "device validated" or "works on device" for any item that lacks a PASSED record with evidence.
12. THE project SHALL NOT change a gate threshold during QA without a `docs/DECISIONS.md` entry.

Verification: review of `docs/DEVICE-TESTS.md` entries against the session template. Device: not applicable. This requirement defines the records themselves.

### Requirement 10: Error-state device coverage (DT-ERR series)

**User Story:** As the owner, I want every user-visible error state reached at least once on the phone, so that no error screen ships untested.

Source: QE-2, DEVICE-TESTS.md (DT-ERR-01 to DT-ERR-05), ARCHITECTURE.md §8, `physical-device-qa` skill (PD-01, PD-03, PD-05).

#### Acceptance Criteria

1. WHEN another app holds the camera and the OverlayKit_App opens, THE Camera_Screen SHALL show the `CAM_UNAVAILABLE` state with a Retry control (DT-ERR-01).
2. WHEN a debug test hook forces `CAM_CAPTURE_FAILED`, `OCR_ENGINE_UNAVAILABLE`, `TR_UNSUPPORTED_PAIR` or `SP_FAILED`, THE OverlayKit_App SHALL show the state that ARCHITECTURE.md §8 specifies for that code (DT-ERR-02).
3. WHEN TM-01 is captured under condition L3, THE OverlayKit_App SHALL show the `OCR_LOW_QUALITY` hint (DT-ERR-03).
4. WHEN Guide reaches a step whose target component is kept out of frame, THE Guide UI SHALL show the `CMP_NOT_VISIBLE` prompt (DT-ERR-04).
5. WHEN a `text-visible` step is not performed, THE Guide UI SHALL show `GD_CHECKPOINT_NOT_SEEN` and SHALL NOT advance the step (DT-ERR-05).
6. THE debug test hooks SHALL be stripped from the Release build, and THE project SHALL verify the absence of those hooks in the release bundle.
7. THE project SHALL record, for each code in ARCHITECTURE.md §8, the unit test that covers it (QE-1) and the DT ID or PD ID that reaches it on the phone (QE-2) in a table in `docs/DEVICE-TESTS.md`.
8. IF a code has no DT or PD record by RC-3, THEN THE project SHALL list that code as not device-verified in the RC-3 record and in the README's limits.

Verification: unit tests for criteria 2 and 6 (hook gating by build variant); a table review for criterion 7. Device: DT-ERR-01 to DT-ERR-05, device validation pending.

### Requirement 11: Device protocol cases PD-01 to PD-09

**User Story:** As the owner, I want the cross-cutting phone checks (permission, focus, light, rotation, interruption, stale overlays, locales, fixture independence, battery) run and recorded, so that the demo doesn't meet a surprise.

Source: `physical-device-qa` skill (PD-01 to PD-09), DEVICE-TESTS.md, D-019, D-020, AT-G1-05.

#### Acceptance Criteria

1. WHEN the Device_Tester runs PD-01, THE OverlayKit_App SHALL show `CAM_PERMISSION_DENIED` or `CAM_PERMISSION_BLOCKED` with the correct button for each permission state, and SHALL NOT crash when permission is revoked while the app is in the background.
2. WHEN the Device_Tester runs PD-02, THE OverlayKit_App SHALL read sharp captures and SHALL show `OCR_LOW_QUALITY` or `OCR_NO_TEXT`, and no confident garbage labels, for a blurred capture.
3. WHEN the Device_Tester runs PD-03, THE OverlayKit_App SHALL show the low-quality hint and no confident wrong translation or highlight.
4. WHEN the Device_Tester runs PD-04, THE OverlayKit_App SHALL keep a portrait UI and SHALL place overlays on their source text with no mirroring.
5. WHEN the Device_Tester runs PD-05, THE OverlayKit_App SHALL resume the preview or show `CAM_UNAVAILABLE` with Retry, and SHALL show no frozen preview with live overlays.
6. WHEN the Device_Tester runs PD-06, THE OverlayKit_App SHALL remove stale overlays under the rules of D-020, and Guide SHALL hide the highlight and pause with `GD_MACHINE_LOST`.
7. WHEN the Device_Tester runs PD-07, THE OverlayKit_App SHALL render Hindi and Kannada without missing-glyph boxes, and SHALL show the Speak_Control only where a Voice exists.
8. WHEN the Device_Tester runs PD-08, THE OverlayKit_App SHALL advance a Guide step only after two consecutive matching observations (D-019), and SHALL NOT advance when the lens is covered, when cards are shown out of order, or when the expected card is shown for one frame only.
9. WHEN the QA_Agent runs PD-09 on a Release build, THE QA_Agent SHALL record `adb shell dumpsys battery`, `dumpsys meminfo com.overlaykit.app` and `dumpsys thermalservice` output at 0, 5 and 10 minutes, and SHALL record freeze-frame latency against AT-G1-05 (p50 ≤ 1.5 s, p95 ≤ 3 s, proposed).
10. THE QA_Agent SHALL record battery drop and device temperature in PD-09 as measurements with no pass or fail limit, because the docs define none.
11. THE QA_Agent SHALL run only the cases that the session's gate needs and SHALL record the others as NOT TESTED with the reason "out of scope for this session".

Verification: PASSED, FAILED or NOT TESTED records per case in `docs/DEVICE-TESTS.md`. Device: PD-01 to PD-09, device validation pending.

### Requirement 12: Release build and signed APK

**User Story:** As a judge, I want an installable app built by the team's own toolchain, so that I can run it on my Android phone.

Source: D-002, D-018, B2, RC-5, hackathon steering ("App access for judges"), build-approach steering.

#### Acceptance Criteria

1. THE project SHALL build the Release_APK locally with Gradle through `npx expo prebuild` and `npx expo run:android --variant release` or the Gradle `assembleRelease` task.
2. THE project SHALL NOT use EAS Build, `eas build` or `eas.json`.
3. THE project SHALL sign the Release_APK with a Keystore that is kept outside git, with `*.jks` gitignored.
4. THE project SHALL NOT commit the Keystore, its passwords or any signing property file.
5. THE project SHALL record the Keystore's backup location with the owner, outside the repository, before the RC commit.
6. WHEN the Release_APK is installed on the Reference phone, THE OverlayKit_App SHALL launch with no dev menu and no red-box error (B2, DT-G0-02).
7. THE Release_APK SHALL contain no debug test hooks and no development client menu.
8. THE project SHALL attach the Release_APK to a GitHub_Release on the public repository and SHALL record the release URL in the README.
9. THE project SHALL record the commit hash of the Release_APK and the SHA-256 checksum of the file in the GitHub_Release notes.
10. THE GitHub_Release SHALL be downloadable without login and without payment.
11. IF the first local release build does not produce an APK (as in `docs/build-log.md`), THEN THE project SHALL record the failure cause and the fix in the Build_Log before the retry.

Verification: command output from the build, `git check-ignore` for the Keystore pattern, and a search of the repository history for signing material. Device: DT-G0-02 and B2, device validation pending.

### Requirement 13: README and honest limits

**User Story:** As a judge or tester, I want a README that tells me what the app does, how to install it and what it cannot do, so that I can test it correctly and don't expect more.

Source: hackathon steering, RC-5, RC-6, PRODUCT.md, D-003, D-005, D-028, product steering ("Truthful capabilities").

#### Acceptance Criteria

1. THE README SHALL describe the app in terms of the three modes: Translate, Explore and Guide.
2. THE README SHALL state the supported scope: Android (tested on the Reference phone) and the languages English, Hindi and Kannada.
3. THE README SHALL state that TM-01 is a first-party simulated machine, shown as images on an iPad with a printed panel as fallback (D-029), and not real-world machine support.
4. THE README SHALL state that iOS is not built or validated.
5. THE README SHALL state that the camera reads English and Hindi only, and that Kannada is a target, UI, content and voice language.
6. THE README SHALL state in its Translate section that translation uses ML Kit on-device only, that the first use of a language pair needs a network to download its model of about 30 MB, and that Translate shows `TR_NOT_CONFIGURED` ("Translation not available") for a language pair that did not pass G2 (D-030). THE README SHALL state that OpenRouter and the translation proxy are deferred.
7. THE README SHALL state that overlays are 2D and anchored to text in the image, and not world tracking, SLAM, ARCore or ARKit.
8. THE README SHALL state that no image leaves the phone, and that translation runs on the phone, with the network used only to download ML Kit language models (D-030).
9. THE README SHALL state that Speak is offered only when the device has a voice for the language.
10. THE README SHALL give install steps for the Release_APK, including allowing installation from the download source and the Android version requirement recorded for the Reference phone.
11. THE README SHALL give steps for judges to display TM-01's panel and screen images from `test-fixtures/tm-01` on a tablet or screen, or to print them at real size, so that judges can test Guide.
12. THE README SHALL give the build and test steps (`npx expo prebuild --clean`, `npx expo run:android --device`, `npm run typecheck`, `npm run lint`, `npm test`, `npx expo-doctor`) that were run, with no step the team has not run.
13. THE README SHALL list the device tests that are PASSED and those not yet run, with a link to `docs/DEVICE-TESTS.md`.
14. THE README SHALL contain no accuracy, latency or support claim beyond the measured, recorded results.
15. THE README SHALL contain no secret, key or token.
16. WHERE a capability has no PASSED device record at the RC commit, THE README SHALL label it "device validation pending".
17. THE README SHALL state that the Hindi and Kannada text in the app and in TM-01 is unreviewed by fluent speakers (D-031).
18. THE README SHALL disclose that the TM-01 artwork is AI-generated and that all text on it is our own (D-032).

Verification: a checklist review of each statement against `docs/DEVICE-TESTS.md`, `docs/DECISIONS.md` and the code, and a text search for the phrases "AR", "world", "ARCore", "ARKit", "iOS", "real machine", "supports Kannada", "reviewed" and "verified by a fluent speaker" in the README, the video script and the Devpost_Text. A match on "reviewed" or "verified by a fluent speaker" is a finding unless a recorded reviewer and date back it. Device: RC-5, device validation pending.

### Requirement 14: LICENSE and repository hygiene

**User Story:** As a hackathon entrant, I want the repository to meet the submission rules, so that the entry is not disqualified.

Source: hackathon steering ("Repository"), D-021, RC-6, static gates Q7, Q8.

#### Acceptance Criteria

1. THE repository SHALL contain a LICENSE_File at the root with an open-source license chosen by the owner (owner Q9, D-021).
2. THE LICENSE_File SHALL name the owner's chosen copyright holder.
3. WHEN the repository is viewed on GitHub while logged out, THE About section SHALL show the detected license.
4. THE repository SHALL be public on GitHub.
5. THE repository SHALL contain the `.kiro` directory at the root, with real specs, hooks and steering.
6. THE `.gitignore` SHALL contain no entry that ignores `.kiro` or any of its subfolders.
7. THE repository SHALL contain all source code, assets and instructions needed to run the project.
8. THE repository SHALL contain no secret, and THE project SHALL run static gate Q7 (a search of `src/` and the output of `npx expo export --platform android` for key patterns) with no matches.
9. THE repository dependencies and `src/` SHALL contain no web-only package and no login or authentication package (static gate Q8).
10. THE repository SHALL contain only self-authored fixtures and no third-party IP. AI-generated artwork with our own text counts as self-authored when the generator and date are recorded (D-032).
11. THE project SHALL disclose in the Devpost_Text that the app started from the `create-expo-app` default template for SDK 58.

Verification: `git check-ignore -v .kiro` returns nothing; file and dependency searches for criteria 8 and 9. The owner must answer Q9 first (OQ-4). Logged-out check: RC-6, device validation not applicable.

### Requirement 15: Manifest permissions

**User Story:** As a user, I want the app to request only the permissions it needs, so that it can't use my microphone, location or storage.

Source: static gate Q9, T10, D-014, D-015, ARCHITECTURE.md §11.

#### Acceptance Criteria

1. WHEN `npx expo prebuild` has run, THE project SHALL inspect the merged Android manifest of the Release_APK source.
2. THE Declared permissions SHALL be `CAMERA`, `INTERNET` and the permissions required by Expo and React Native core.
3. THE project SHALL list each Declared permission and its justification in the Build_Log.
4. IF the Declared permissions include `RECORD_AUDIO`, a location permission or a storage permission, THEN THE project SHALL remove the cause or record an owner-approved decision in `docs/DECISIONS.md` before release.
5. IF installing `expo-speech` adds a permission to the merged manifest, THEN THE project SHALL list that permission and SHALL treat it as a Q9 finding.
6. THE release build SHALL disable cleartext traffic, as stated in ARCHITECTURE.md §11 (T5).

Verification: manifest inspection output recorded in the Build_Log (Q9). Device: not applicable.

### Requirement 16: Static, build and unit gates at the release commit

**User Story:** As the owner, I want every automated check to pass on the release commit, so that the release rests on evidence.

Source: static gates Q1 to Q9, build gates B1 and B2, QE-1, QE-3, RC-3, quality steering ("Before calling a task done").

#### Acceptance Criteria

1. WHEN the RC_Commit is chosen, THE project SHALL run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo-doctor` and `npx expo install --check`, and SHALL record each command, its exit code and the relevant output lines.
2. THE project SHALL treat any non-zero exit code as a failed gate.
3. THE project SHALL record the RC_Commit hash in the Build_Log (RC-3).
4. THE project SHALL confirm that every error code in ARCHITECTURE.md §8 has a unit test showing the owning module produces it and the `ui` module maps it to the specified state (QE-1).
5. THE project SHALL confirm that each label in an overlay is in exactly one of translated, pending, failed or unsupported (QE-3).
6. THE project SHALL NOT delete, skip, weaken or re-snapshot a test to make a gate pass.
7. IF a gate fails, THEN THE project SHALL record the failure and its cause in the Build_Log and SHALL NOT report the gate as passed.
8. WHEN `npx expo install --check` or `npx expo-doctor` reports an issue after `expo-speech` is added, THE project SHALL fix the issue before the RC_Commit.

Verification: the recorded command output. Device: B2 on the Reference phone, device validation pending.

### Requirement 17: Release candidate checks RC-1 to RC-6

**User Story:** As the owner, I want the six release checks run in order on one commit, so that the demo build is the one that was tested.

Source: QUALITY-GATES.md (RC-1 to RC-6), DT-RC-01, DT-RC-02, hackathon steering ("Final check").

#### Acceptance Criteria

1. WHEN the Release build is installed fresh on the Reference phone, THE Device_Tester SHALL run S1 three times in a row, and each run SHALL pass (RC-1, DT-RC-01).
2. WHEN the Release build runs S1-N on at least 3 negative-set machines, THE OverlayKit_App SHALL pass each run (RC-2, DT-RC-02).
3. WHEN the Release build runs in airplane mode, THE OverlayKit_App SHALL pass the G1, G3 and G4 behaviours (RC-4), and Translate SHALL show `TR_OFFLINE` for cloud pairs.
4. THE project SHALL record the RC-3 static, build and error-state results against the RC_Commit.
5. WHEN an Outside tester follows the README on their own Android phone with the Release_APK from the GitHub_Release, THE Outside tester SHALL complete S1 (RC-5).
6. THE project SHALL record the Outside tester's phone model, Android version and result in `docs/DEVICE-TESTS.md`.
7. THE project SHALL check the submission items of RC-6 while logged out: public repository, LICENSE shown in About, `.kiro` at the root, no secrets, and a Demo_Video under 3 minutes that shows the app on a real phone.
8. IF any RC check is FAILED or NOT TESTED, THEN THE project SHALL NOT mark the release candidate as passed and SHALL list the open check in the Build_Log.
9. IF any Guide step is shown for a machine that is not `verified`, THEN THE project SHALL block the release (QUALITY-GATES.md G4 stop condition).
10. WHEN any code changes after RC-1, THE project SHALL repeat the RC checks that the change can affect, on the new commit.

Verification: PASSED records per RC item in `docs/DEVICE-TESTS.md`. Device: DT-RC-01, DT-RC-02 and RC-5, device validation pending. Until they exist, the release candidate isn't claimed to pass.

### Requirement 18: Demo video and fixture independence

**User Story:** As a judge, I want a short video of the app on a real phone that shows only what it can do, so that I can judge it fairly.

Source: hackathon steering ("Video", "Honest Kiro usage evidence"), PRODUCT.md (TM-01 wording), RC-6.

#### Acceptance Criteria

1. THE Demo_Video SHALL be shorter than 3 minutes.
2. THE Demo_Video SHALL be uploaded to YouTube and publicly visible.
3. THE Demo_Video SHALL show the OverlayKit_App running on a real phone.
4. THE Demo_Video SHALL show only capabilities that have a PASSED record in `docs/DEVICE-TESTS.md`.
5. THE Demo_Video SHALL label TM-01 as a first-party simulated machine shown as images on an iPad.
6. THE Demo_Video SHALL contain no third-party trademark and no copyrighted music without permission.
7. THE Demo_Video SHALL NOT claim iOS support, real-world machine support, Kannada camera reading or world tracking.
8. THE project SHALL keep a script for the Demo_Video in the repository that lists, for each shown capability, the DT or PD ID that supports it.
9. WHEN the Demo_Video shows Translate on a language pair that has no working route, THE Demo_Video SHALL show the `TR_NOT_CONFIGURED` state as it appears and SHALL NOT replace it with fake output.

Verification: review of the script's capability-to-record table. Logged-out check of the video link (RC-6). Device: the shown capabilities need PASSED records, device validation pending.

### Requirement 19: Devpost text and Kiro evidence

**User Story:** As a hackathon entrant, I want the submission text and the Kiro write-up to match what was really done, so that judges can trust it.

Source: hackathon steering ("Submission form", "Judging", "Honest Kiro usage evidence"), D-024 to D-026, CAPABILITY-MAP.md §4.D.

#### Acceptance Criteria

1. THE Devpost_Text SHALL include an English description of features and functionality.
2. THE Devpost_Text SHALL state the category as Frankenstein.
3. THE Devpost_Text SHALL include a write-up of how Kiro was used.
4. THE Devpost_Text SHALL list only Kiro features recorded in the Kiro_Evidence_Log.
5. THE Kiro_Evidence_Log SHALL hold dated entries, each with the spec or task, the prompt, the files changed, and the result.
6. THE Kiro_Evidence_Log SHALL include hook output, including at least one real failure and its fix, where such a failure happened.
7. THE Kiro_Evidence_Log SHALL include the tests and property-test results, and the device result or "device validation pending".
8. THE project SHALL NOT claim a disabled hook, an unconfigured MCP server, an uninstalled Power or an agent that was never run (D-025, D-026).
9. THE Devpost_Text SHALL contain no claim about iOS support, real-world machine support, Kannada camera reading, or accuracy beyond the measured results.
10. THE Devpost_Text SHALL contain links to the repository, the GitHub_Release and the Demo_Video, and SHALL be checked while logged out.
11. THE Devpost_Text SHALL state the TM-01 form (first-party simulated machine shown as images on an iPad) and the Translate limits stated in the README.
12. THE project SHALL submit before 4 Dec 2026, 2:00 pm Pacific, with the internal target of 3 Dec, and SHALL re-check the rules page before submitting.
13. THE Devpost_Text SHALL state that the Hindi and Kannada text is unreviewed by fluent speakers (D-031) and SHALL disclose that the TM-01 artwork is AI-generated with our own text (D-032).

Verification: review of each Devpost_Text claim against the Kiro_Evidence_Log, `docs/DEVICE-TESTS.md` and the code. Device: not applicable.

### Requirement 20: Truthful capability wording

**User Story:** As a user and a judge, I want every statement about the app to be true, so that I'm never misled about what it can do.

Source: product steering ("Truthful capabilities"), PRODUCT.md, quality steering ("Never"), vision-safety-review skill.

#### Acceptance Criteria

1. THE project SHALL describe overlays as 2D labels anchored to text in the image, and SHALL NOT call them world tracking, SLAM, ARCore or ARKit.
2. THE project SHALL describe Android as the only tested platform.
3. THE project SHALL describe the camera as reading English and Hindi only.
4. THE project SHALL describe translations as coming from the translation provider, and SHALL NOT describe fixture content or canned strings as translations of arbitrary text.
5. THE project SHALL describe Guide as available only for TM-01 when the machine is identified as `verified`.
6. THE project SHALL describe translation as ML Kit on-device translation of recognized text only (D-030), and SHALL NOT describe any LLM-generated explanation or instruction.
7. THE project SHALL NOT claim a gate passed, or that something works on the device, without a record in `docs/DEVICE-TESTS.md`.
8. IF a capability's device test is FAILED or NOT TESTED at release, THEN THE project SHALL either omit the capability from the release text or state it as not validated.
9. IF the release text contains the word "reviewed" or the phrase "verified by a fluent speaker" without a recorded reviewer and date, THEN THE release-claims check SHALL flag it as a finding (D-031).

Verification: the search and checklist review in Requirement 13, applied to the README, the video script, the Devpost_Text and the in-app strings. The `vision-reviewer` agent may be run on the final diff; it reads only and records no device result.

## Open Questions

Each item below is **pending owner decision**. The criteria use the recommended default until the owner decides.

### OQ-1: `expo-speech` approval and compatibility

- **Conflict:** D-014 names `expo-speech` as a candidate, but stack steering requires the owner's approval first, with a cited compatibility check for SDK 58 and RN 0.88 New Architecture. No check has been done.
- **Sources:** D-014, stack steering ("Adding a dependency"), AT-G4-07.
- **Recommended default:** the owner approves `expo-speech` for gate task AT-G4-07. The agent checks the official Expo docs, cites them, installs with `npx expo install expo-speech`, and runs `npx expo install --check` and `npx expo-doctor`. If it fails the check, a Kotlin adapter around the Android `TextToSpeech` API needs a new decision.
- **Used by:** Requirements 4, 5 and 15.

### OQ-2: Voice availability check

- **Conflict:** D-014 requires a per-locale voice check at runtime. The docs don't say how often the app re-checks.
- **Sources:** D-014, AT-G4-07, PD-07.
- **Recommended default:** check when the Step_Card is shown, when the Settings_Screen is shown, and when the app returns to the foreground. No polling.
- **Used by:** Requirements 2, 4 and 5.

### OQ-3: Back behaviour during Guide

- **Conflict:** the docs don't say what happens to a running workflow on Android back. Spec C's OQ-7 recommends cancel and return to `idle`.
- **Sources:** native-ux steering, spec C OQ-7.
- **Recommended default:** adopt spec C's recommended default, and let the owner decide once for both specs.
- **Used by:** Requirement 3.

### OQ-4: License and copyright holder

- **Conflict:** D-021 is Proposed. Owner Q9 is unanswered. No LICENSE_File exists.
- **Sources:** D-021, hackathon steering, owner Q9.
- **Recommended default:** MIT, with the team as copyright holder, as D-021 proposes. The owner confirms the holder's name.
- **Used by:** Requirement 14.

### OQ-5: Release signing and keystore backup

- **Conflict:** D-018 says the owner backs up the keystore. It names no location, and no keystore exists.
- **Sources:** D-018.
- **Recommended default:** the owner creates the keystore locally, outside the repository, with the passwords stored in the owner's password manager. The agent never reads or prints them.
- **Used by:** Requirement 12.

### OQ-6: Reference phone and outside tester

- **Conflict:** owner Q4 is unanswered, and no phone is connected, so B1 and B2 haven't run. RC-5 needs a person outside the team, who is not named.
- **Sources:** DEVICE-TESTS.md, QUALITY-GATES.md (RC-5), owner Q4.
- **Recommended default:** the owner names the Reference phone and the outside tester. Until then, every device criterion is "device validation pending".
- **Used by:** Requirements 9, 11, 12 and 17.

### OQ-7: Device tests for accessibility and bright light

- **Conflict:** native-ux steering requires TalkBack announcements, reduced motion, the largest font size and condition L1, but `docs/DEVICE-TESTS.md` has no DT IDs for them.
- **Sources:** native-ux steering, DEVICE-TESTS.md, `physical-device-qa` skill.
- **Recommended default:** add DT-A11Y-xx cases to `docs/DEVICE-TESTS.md` for TalkBack, reduced motion, largest font size and L1 legibility. The agent adds the test definitions only, with no results.
- **Used by:** Requirements 7 and 8.

### OQ-8: Network availability for README claims about translation

- **Conflict:** D-030 limits translation to ML Kit on-device and defers the proxy and OpenRouter. Which pairs pass G2 is decided in spec B. The README can't state the final per-pair result before that.
- **Sources:** D-027, D-028, D-030, QUALITY-GATES.md (G2 stop conditions).
- **Recommended default:** the README's Translate section is written after spec B's G2 result and states ML Kit on-device, the first-use model download (about 30 MB), and which pairs show `TR_NOT_CONFIGURED`. Until then it says "translation routes not yet decided".
- **Used by:** Requirements 13 and 19.

### OQ-9: Submission date and rules re-check

- **Conflict:** the hackathon rules were checked on 2026-11-17 and the rules page wins over the steering file. Owner Q6 (the 3 Dec target) is unanswered.
- **Sources:** hackathon steering, owner Q6.
- **Recommended default:** re-check `kiroween.devpost.com/rules` at the start of release work and again before submitting, and record the check date in the Build_Log.
- **Used by:** Requirement 19.

## Dependencies

- **Spec A (`camera-ocr-geometry`):** the Camera_Screen, the Overlay_Layer, capture, OCR and geometry must be merged. AT-G1-02 must pass on the phone.
- **Spec B (`translation-explore`):** `t(key)`, the Settings route with the language and OpenRouter key sections, the Privacy_Note, Explore, and the G2 routing result. The README's Translate wording waits for it (OQ-8).
- **Spec C (`guided-ticket-workflow`):** the Guide mode, `GuideState`, the Step_Card with its Speak_Slot, and the Guide states that this spec announces. Speech and navigation tasks can start once spec B's Settings route exists (CAPABILITY-MAP.md §4.D). The release checks need spec C complete for S1.
- **Owner Q2 (TM-01 form, answered by D-029), Q4 (Reference phone, deferred by D-031), Q5 (reviewers, removed by D-031), Q6 (submission target), Q9 (license):** see `tasks/todo.md`. Q4 is needed for every device criterion and stays open.
- **Dependency needing owner approval before install:** `expo-speech` (OQ-1).
- **Proposed decisions:** D-003, D-014, D-018, D-021 are Proposed in `docs/DECISIONS.md`. These requirements assume them. D-002 is Accepted.
- **Static gates:** the module-boundary lint rule (Q4) isn't added yet, so Requirement 4 criterion 2 has no automatic check.
- **Build state:** the first release build stopped before producing an APK (`docs/build-log.md`). Requirement 12 starts from that state.
- **Existing steering and skills used:** `.kiro/steering/native-ux.md`, `.kiro/steering/hackathon.md`, `.kiro/skills/physical-device-qa/SKILL.md`, `.kiro/skills/vision-safety-review/SKILL.md`.
- **Stop condition:** any Guide step shown for a machine that isn't `verified` blocks release (QUALITY-GATES.md G4).
