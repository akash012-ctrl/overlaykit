# OverlayKit: real-device tests

Status: **no device tests run yet.** No phone has been connected (`adb devices` listed none on 2026-11-17).

Acceptance test IDs (AT-xx) are defined in [QUALITY-GATES.md](QUALITY-GATES.md). This file defines how to run them on a phone and where to record results. The cross-cutting phone protocol (PD-01 to PD-09) and the result rules live in the Kiro skill `.kiro/skills/physical-device-qa/SKILL.md`.

## Reference device

Fill this in before G0. All gate measurements use this phone.

| Field | Value |
| --- | --- |
| Model | TBD |
| Android version / security patch | TBD |
| RAM | TBD |
| Google Play services version | TBD |
| Rear camera resolution | TBD |
| Text-to-speech engine, and voices installed for en / hi / kn | TBD |
| System fonts render Devanagari and Kannada (check in any app) | TBD |

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
| TM-01 | The verified ticket machine, or its printed panel replica | Choice pending (Q2). The replica must be printed at real size. |
| CARD-EN | Printed card with 10 English sign/label lines | Ground-truth text kept in `test-fixtures/` |
| CARD-HI | Printed card with 10 Hindi lines (Devanagari) | Same |
| CARD-KN | Printed card with 10 Kannada lines | Expected result: unsupported script |
| BLANK | Plain wall or paper | Expected result: no text |
| NEG-01 … NEG-10 | Other machines, panels, or photos, including at least 3 other ticket machines | For false-match tests |

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
| DT-G2-02 | AT-G2-04 | NET-OFF (cloud provider) | Translate TM-01 | Original text with "Offline" markers |
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
| DT-ERR-01 | QE-2 | Another app holding the camera | Open OverlayKit | `CAM_UNAVAILABLE` state |
| DT-ERR-02 | QE-2 | Debug build with test hooks forcing `CAM_CAPTURE_FAILED`, `OCR_ENGINE_UNAVAILABLE`, `TR_UNSUPPORTED_PAIR`, `SP_FAILED` | Trigger each | Matching state from ARCHITECTURE.md §8 |
| DT-ERR-03 | QE-2 | TM-01, L3 (dim) | Capture | `OCR_LOW_QUALITY` hint |
| DT-ERR-04 | QE-2 | Guide on TM-01, target component kept out of frame | Advance to that step | `CMP_NOT_VISIBLE` prompt |
| DT-ERR-05 | QE-2 | Guide on TM-01, `text-visible` step | Don't perform the step | `GD_CHECKPOINT_NOT_SEEN`; step doesn't advance |
| DT-RC-01 | RC-1 | Release build, fresh install | Run S1 three times in a row | All pass |
| DT-RC-02 | RC-2, RC-4 | Release build | Run S1-N on 3 negative machines; run S1 in airplane mode | All pass |

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

None yet.
