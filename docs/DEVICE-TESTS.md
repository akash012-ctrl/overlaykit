# OverlayKit: real-device tests

Status: **DT-G0-01 PASSED on 2026-11-19 (session 2). No other case has run.** The reference phone is a Redmi Note 12 Pro 5G, confirmed by the owner on 2026-11-19 (Q4). In session 1 the debug build (B1) failed on the Windows host. In session 2, after the long-path fix, it installed and launched, and the owner confirmed the home screen.

Acceptance test IDs (AT-xx) are defined in [QUALITY-GATES.md](QUALITY-GATES.md). This file defines how to run them on a phone and where to record results. The cross-cutting phone protocol (PD-01 to PD-09) and the result rules live in the Kiro skill `.kiro/skills/physical-device-qa/SKILL.md`.

## Reference device

All gate measurements use this phone. The owner confirmed it as the reference phone on 2026-11-19 (Q4). Values below were read with `adb shell` on 2026-11-19 (agent-observed).

| Field | Value |
| --- | --- |
| Model | Xiaomi Redmi Note 12 Pro 5G (`ro.product.model` 22101316I, device `ruby`), arm64-v8a |
| Android version / security patch | Android 14 (API 34), HyperOS `OS2.0.16.0.UMOINXM`, security patch 2026-10-01 |
| RAM | `MemTotal` 5,668,324 kB |
| Google Play services version | 26.45.31 (190400-1020418964) |
| Rear camera resolution | Camera2 pixel array of the first back camera: 4096 × 3072. Two more back cameras report 3264 × 2448 and 1600 × 1200. The capture size the app uses is set in G1a. |
| Screen | 1080 × 2400 px at 440 dpi (about 393 × 873 dp), system font scale 1.0, system locale en-US |
| Text-to-speech engine, and voices installed for en / hi / kn | Default engine `com.google.android.tts`. Installed voices not checked yet. |
| System fonts render Devanagari and Kannada (check in any app) | Not checked yet (needs a tester). |

## Setup (Windows host)

```powershell
# One-time per shell: point Gradle at Android Studio's bundled JDK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

# Phone: enable Developer options and USB debugging, connect by USB, accept the prompt
adb devices                                   # phone must be listed as "device"

# From the repo root
npx expo prebuild --clean                     # regenerate android/ after native or config changes
npx expo run:android --device                 # debug development build (gate B1)
npx expo run:android --device --variant release   # release build (gate B2); confirm flag with --help in G0
```

Record the commit (`git rev-parse --short HEAD`) and build variant for every session.

## Test conditions

| Code | Condition |
| --- | --- |
| L1 | Daylight or bright indoor light |
| L2 | Normal indoor light (default for gates) |
| L3 | Dim light |
| D30 / D60 / D100 | Phone 30, 60, or 100 cm from the panel |
| A0 / A30 | Phone facing the panel head-on, or 30° off-axis horizontally |
| M0 / M1 | Phone held still, or slow pan (live mode only) |
| NET-ON / NET-OFF | Network on, or airplane mode |

## Physical fixtures

| ID | Item | Notes |
| --- | --- | --- |
| TM-01 | First-party simulated ticket machine: images of a base panel and screens S01 to S06, shown on an iPad as a passive display (D-029, D-032). Ground truth: `test-fixtures/tm-01/FIXTURE.md`. | iPad at full brightness, auto-lock off. Printed paper is the fallback if glare or screen pattern gives recall under 70%. |
| S01 | TM-01 Screen image S01 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| S02 | TM-01 Screen image S02 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| S03 | TM-01 Screen image S03 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| S04 | TM-01 Screen image S04 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| S05 | TM-01 Screen image S05 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| S06 | TM-01 Screen image S06 (screen shown on the iPad). Identifying texts and the expected Guide checkpoints: `test-fixtures/tm-01/FIXTURE.md` section 6. | Used by DT-G4-02 to DT-G4-06. Final images pending (box positions are DRAFT). |
| CARD-EN | Image (or printed card) with 10 English sign/label lines | Ground-truth text kept in `test-fixtures/` |
| CARD-HI | Image (or printed card) with 10 Hindi lines (Devanagari) | Same |
| CARD-KN | Image (or printed card) with 10 Kannada lines | Expected result: unsupported script |
| BLANK | Plain wall, paper, or a plain grey image on the iPad | Expected result: no text |
| NEG-01 … NEG-10 | Images listed in `test-fixtures/tm-01/FIXTURE.md` section 8: other generated panels, reworded or cropped TM-01 art, and similar machines | For false-match tests. Self-generated art only. |

## Test cases

| ID | Gate / AT | Setup | Steps | Expected |
| --- | --- | --- | --- | --- |
| DT-G0-01 | AT-G0-01 | Debug build | Launch app | Home screen renders, no red box |
| DT-G0-02 | AT-G0-02 | Release build | Launch app | Home screen renders, no dev menu |
| DT-G1-01 | AT-G1-01 | Fresh install | Deny camera, then allow; reinstall and pick "don't ask again" | Correct permission state each time; "Open settings" works |
| DT-G1-02 | AT-G1-02 | TM-01, L2, D60, A0 | Capture 10 times | Count recognized TM-01 label strings per capture |
| DT-G1-03 | AT-G1-03, AT-G1-04 | TM-01, L2, each of D30/D60/D100 × A0/A30 | Capture, take a screenshot | Measure overlay-to-source offset on screenshots |
| DT-G1-04 | AT-G1-05 | Release build, TM-01, L2, D60 | 20 captures, timestamps logged | p50 and p95 capture-to-overlay time |
| DT-G1-05 | AT-G1-06 | Release build, live mode, TM-01, M0 then M1 | Run 10 minutes | Update rate, jitter, memory trend, no crash or thermal shutdown |
| DT-G1-06 | AT-G1-07 | CARD-HI, L2, D60 | Capture 5 times | Lines recognized as Devanagari |
| DT-G1-07 | AT-G1-08 | CARD-KN, L2, D60 | Capture 5 times | Unsupported-script or no-text state; no garbled text shown as real |
| DT-G1-08 | AT-G1-09 | BLANK | Capture | "No text found" within 2 s |
| DT-G1-09 | AT-G1-10 | NET-OFF, fresh install | Repeat DT-G1-02 | Same pass rate as online |
| DT-G1-10 | AT-G1-11 | Debug build | Capture 5 times, then list the app's cache directory with `adb shell run-as com.overlaykit.app ls cache` | No leftover still images |
| DT-G2-01 | AT-G2-03 | Target hi, then kn | Translate TM-01 | Correct script, no missing-glyph boxes |
| DT-G2-02 | AT-G2-04 | NET-OFF (pair model not yet downloaded) | Translate TM-01 | With ML Kit on-device, a language pair whose model is not downloaded shows the offline or failed state, never a translation (D-030) |
| DT-G2-03 | AT-G2-04 | Debug build with test hooks forcing timeout, 429, 5xx | Translate | Matching `TR_*` state for each |
| DT-G2-04 | AT-G2-05 | Target en | Translate CARD-EN | No translation request; text shown as-is |
| DT-G2-05 | AT-G2-07 | Debug build, network inspector | Translate TM-01 | Request bodies contain text only, no image data |
| DT-G2-06 | AT-G2-09 | Release build, Wi-Fi | Translate TM-01 10 times | p50 ≤ 2 s |
| DT-G3-01 | AT-G3-01 | TM-01, D30/D60/D100 × A0/A30 | 20 identification attempts | ≥ 95% `verified` |
| DT-G3-02 | AT-G3-02 | NEG-01 … NEG-10 | 3 attempts each | 0 matches to TM-01 |
| DT-G3-03 | AT-G3-03 | TM-01 partly out of frame | Identify | `ambiguous`, treated as unverified |
| DT-G3-04 | AT-G3-04, AT-G3-05 | TM-01, target kn | Tap each component | Correct component; Kannada explanation |
| DT-G3-05 | AT-G3-06 | NEG-01 | Tap a label | Translation plus "Not a verified machine" |
| DT-G4-01 | AT-G4-01 | NEG-01 … NEG-10 | Open Guide | Refusal message on each |
| DT-G4-02 | AT-G4-02, AT-G4-03 | TM-01, target kn | Run the workflow to the end | Each target highlighted correctly; checkpoints respected |
| DT-G4-03 | AT-G4-04 | Mid-workflow | Point away 5 s, then back | Paused, then resumed after re-identification |
| DT-G4-04 | AT-G4-05 | Mid-workflow | Point at NEG-01 | Workflow cancelled |
| DT-G4-05 | AT-G4-07 | With and without a Kannada voice installed | Open a step | Speak works, or is hidden |
| DT-G4-06 | AT-G4-08 | Mid-workflow | Background the app 30 s, return | Same step or safe reset; no skipped step |
| DT-G4-07 | AT-G4-06, QE-2 | Debug build, invalid-workflow hook | Open Guide, choose the DEBUG invalid workflow | `GD_FIXTURE_INVALID` state: "Step-by-step help isn't available" with Translate and Explore; no Step |
| DT-ERR-01 | QE-2 | Another app holding the camera | Open OverlayKit | `CAM_UNAVAILABLE` state |
| DT-ERR-02 | QE-2 | Debug build with test hooks forcing `CAM_CAPTURE_FAILED`, `OCR_ENGINE_UNAVAILABLE`, `TR_UNSUPPORTED_PAIR`, `SP_FAILED` | Trigger each | Matching state from ARCHITECTURE.md §8 |
| DT-ERR-03 | QE-2 | TM-01, L3 (dim) | Capture | `OCR_LOW_QUALITY` hint |
| DT-ERR-04 | QE-2 | Guide on TM-01, target component kept out of frame | Advance to that step | `CMP_NOT_VISIBLE` prompt |
| DT-ERR-05 | QE-2 | Guide on TM-01, `text-visible` step | Don't perform the step | `GD_CHECKPOINT_NOT_SEEN`; step doesn't advance |
| DT-RC-01 | RC-1 | Release build, fresh install | Run S1 three times in a row | All pass |
| DT-RC-02 | RC-2, RC-4 | Release build | Run S1-N on 3 negative machines; run S1 in airplane mode | All pass |

### Accessibility (spec 04, task 7). Definitions only. Status: NOT TESTED, device validation pending.

| ID | Gate / AT | Setup | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- |
| DT-A11Y-01 | R7.1 to R7.4 | Release build, TalkBack on | Switch Translate, Explore and Guide; open a Guide step; go Back to the previous step; trigger pause, cancel and complete | Each mode name is announced once. Each new step instruction is announced once. Going back to a step announces it again. Pause, cancel and completion are spoken once | NOT TESTED |
| DT-A11Y-02 | R7.5 to R7.7 | Release build, system "Remove animations" on, then off | Open Guide on a step with a highlight | On: highlight is a static outline. Off: any animation starts only after the setting is read. Changing the setting needs no restart | NOT TESTED |
| DT-A11Y-03 | R8.1 to R8.5 | Largest system font size, then the largest display size | Open Camera screen, a Guide step card and Settings in en, hi and kn | No clipped text, no overlap, Speak, Done and Back reachable, no fixed-height container cuts a line | NOT TESTED |
| DT-A11Y-04 | R8.6, L1 | L1 bright light, Release build | Read the top bar, bottom bar, labels and step card outdoors or under a bright lamp | All text legible without shading the screen by hand. Record the phone brightness setting | NOT TESTED |

### QE-2: error code, unit test and device test (spec 04, task 7)

Unit tests (QE-1) are deferred by the owner. "Unit test" lists where a test exists today or "deferred". Device cases reach the UI state. Status: NOT TESTED for every row.

| Code | Unit test (QE-1) | Device case |
| --- | --- | --- |
| CAM_PERMISSION_DENIED | existing (camera-screen) | DT-G1-01 |
| CAM_PERMISSION_BLOCKED | existing (camera-screen) | DT-G1-01 |
| CAM_UNAVAILABLE | existing (camera-screen) | DT-ERR-01 |
| CAM_CAPTURE_FAILED | existing (camera-screen) | DT-ERR-02 |
| OCR_ENGINE_UNAVAILABLE | existing (camera-screen) | DT-ERR-02 |
| OCR_RECOGNITION_FAILED | existing (camera-screen) | DT-G1-02 (debug hook) |
| OCR_NO_TEXT | existing (camera-screen) | DT-G1-08 |
| OCR_LOW_QUALITY | existing (camera-screen) | DT-ERR-03 |
| OCR_UNSUPPORTED_SCRIPT | existing (camera-screen) | DT-G1-07 |
| TR_NOT_CONFIGURED | existing | DT-G2-02 |
| TR_OFFLINE | existing | DT-G2-02 |
| TR_TIMEOUT | existing | DT-G2-03 |
| TR_RATE_LIMITED | existing | DT-G2-03 |
| TR_PROVIDER_ERROR | existing | DT-G2-03 |
| TR_UNSUPPORTED_PAIR | existing | DT-ERR-02 |
| TR_KEY_INVALID | existing | none while the OpenRouter key is deferred (D-030) |
| TR_NO_CREDITS | existing | none while the OpenRouter key is deferred (D-030) |
| MCH_NOT_VERIFIED | code list only (error-codes.test) | DT-G3-05, DT-G4-01 |
| MCH_AMBIGUOUS | code list only (error-codes.test) | DT-G3-03 |
| CMP_NOT_VISIBLE | code list only (error-codes.test) | DT-ERR-04 |
| GD_UNSUPPORTED | none today (deferred by owner: tests) | DT-G4-01 |
| GD_MACHINE_LOST | none today (deferred by owner: tests) | DT-G4-03 |
| GD_MACHINE_CHANGED | none today (deferred by owner: tests) | DT-G4-04 |
| GD_CHECKPOINT_NOT_SEEN | none today (deferred by owner: tests) | DT-ERR-05 |
| GD_FIXTURE_INVALID | none today (deferred by owner: tests) | DT-G4-07 |
| SP_NO_VOICE | deferred (tests deferred by owner) | DT-G4-05 |
| SP_FAILED | deferred (tests deferred by owner) | DT-ERR-02 |

Note: "existing" means the code appears in a test file today (found by search, tests not run for this table). "SP_*" rows have no test yet. Guide and device-case mapping for TM-01 wording will change with spec 05 (any-machine Guide). Device IDs above that name TM-01 or NEG fixtures are kept as written until spec 05 revises them.

## Result log

Copy this block for each session. Keep screenshots under `docs/device-results/<date>/` (create the folder when needed).

```
### <YYYY-MM-DD> session <n>
- Commit: <hash>   Variant: debug | release
- Device: <model>, Android <version>
- Tester: <name>
- Conditions: <codes>

| Test ID | Result (PASSED / FAILED / NOT TESTED) | Observed by | Measurement | Notes / evidence path |
| --- | --- | --- | --- | --- |
```

## Results

### 2026-11-19 session 1
- Commit: `fd6ac5e` plus uncommitted spec 01 work (tasks 2 to 8)   Variant: debug
- Device: Xiaomi Redmi Note 12 Pro 5G (22101316I), Android 14, connected over USB, adb state `device`
- Tester: none. Agent only, no one watched the screen.
- Conditions: none (no camera case in scope)

| Test ID | Result (PASSED / FAILED / NOT TESTED) | Observed by | Measurement | Notes / evidence path |
| --- | --- | --- | --- | --- |
| DT-G0-01 | NOT TESTED | Agent: `npx expo run:android --device 22101316I` output | — | The app was never installed: gate B1 failed on the Windows host with `ninja: error: Stat(...): Filename longer than 260 characters` in `:app:buildCMakeDebug[arm64-v8a]`. Details in `docs/build-log.md`, 2026-11-19. `adb shell pm list packages com.overlaykit.app` returned nothing afterwards. |
| DT-G0-02 | NOT TESTED | — | — | Release build not attempted; B1 must pass first. |

Summary: 0 PASSED, 0 FAILED, 2 NOT TESTED. The phone is connected and authorized for adb, but no OverlayKit build has reached it. G0 (AT-G0-01, AT-G0-02) and every later device gate stay blocked until the host build path problem is fixed. Next action: fix the CMake/Ninja path limit on the host (see build-log), then re-run B1.

### 2026-11-19 session 2
- Commit: `fd6ac5e` plus uncommitted spec 01 work (tasks 2 to 8)   Variant: debug (JS from Metro over `adb reverse tcp:8081`)
- Device: Xiaomi Redmi Note 12 Pro 5G (22101316I), Android 14, USB
- Tester: owner (reported in chat)
- Conditions: none (no camera case in scope)

| Test ID | Result (PASSED / FAILED / NOT TESTED) | Observed by | Measurement | Notes / evidence path |
| --- | --- | --- | --- | --- |
| DT-G0-01 | PASSED | Tester: owner, who reported in chat seeing "OverlayKit" with the Translate, Explore and Guide chips on a dark background and no error. Agent: `pm list packages`, `pidof`, `dumpsys activity`, `uiautomator dump`, `logcat *:E`. | Installed, process 30691 running, `MainActivity` resumed. Accessibility text: "OverlayKit", "Camera language assistant (placeholder)", "Translate", "Explore", "Guide". No React Native error in logcat. | No screenshot kept: the agent's `screencap` caught the phone's launcher, not the app, so it was deleted unsaved. Build details in `docs/build-log.md`, 2026-11-19 "B1 after the long-path fix". |
| DT-G0-02 | NOT TESTED | — | — | Release build (B2) not attempted yet. |

Summary: 1 PASSED, 0 FAILED, 1 NOT TESTED. AT-G0-01 is met on this phone. AT-G0-02 (release build, B2) is still open. Later on 2026-11-19 the app was rebuilt with the new launcher icon and splash (build-log, "App icon and splash"), with no JavaScript change. The owner still has to look at the new icon on the launcher.

## Guide (spec 03): rows waiting for a phone run

Added by spec 03 lane G. Every row is NOT TESTED. No Guide gate is claimed. Results go in a dated block under Results, from a real phone run.

| Test ID | Result | Needs |
| --- | --- | --- |
| DT-G4-01 | NOT TESTED | NEG-01 to NEG-10, Guide build |
| DT-G4-02 | NOT TESTED | TM-01 S01 to S06, G4 thresholds set |
| DT-G4-03 | NOT TESTED | TM-01, G4 thresholds set |
| DT-G4-04 | NOT TESTED | TM-01, NEG-01, G4 thresholds set (OQ-3) |
| DT-G4-06 | NOT TESTED | TM-01, G4 thresholds set |
| DT-G4-07 | NOT TESTED | Debug build only |
| DT-ERR-04 | NOT TESTED | TM-01, G4 thresholds set |
| DT-ERR-05 | NOT TESTED | TM-01, G4 thresholds set |
