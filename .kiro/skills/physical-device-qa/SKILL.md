---
name: physical-device-qa
description: Plan, run and record OverlayKit's manual test protocol on a physical Android phone. Covers camera permission, focus, dim light, rotated phone, camera interruption and backgrounding, stale overlays, Hindi and Kannada locales, fixture independence, and battery/performance. Use when preparing a real-device test session, recording results in docs/DEVICE-TESTS.md, or deciding whether a quality gate has device evidence. Every result is PASSED, FAILED or NOT TESTED, and the agent never claims it tested hardware it cannot access.
compatibility: Needs a physical Android phone with USB debugging, adb on PATH, and an OverlayKit build installed with npx expo run:android --device. Performance checks need a release build.
metadata:
  project: overlaykit
  version: "1.0"
---

# Physical-device QA for OverlayKit

Project references: `docs/DEVICE-TESTS.md` (reference device, conditions L1–L3 / D30–D100 / A0–A30, fixtures, DT cases, result log), `docs/QUALITY-GATES.md` (thresholds), `docs/ARCHITECTURE.md` §8 (error states).

## Who observes what

The agent cannot hold the phone, see through the camera, look at the screen, or judge whether an overlay sits on its text. A person does that.

| Evidence source | Counts for | Never counts for |
| --- | --- | --- |
| **Tester-observed**: what the named tester saw and reported, ideally with a screenshot or screen recording | Visual and physical results: alignment, readability, focus, lighting, rotation, fixture behaviour | — |
| **Agent-observed**: output of a command the agent ran in this session, such as `adb shell dumpsys battery` or `npm run test:e2e` | Only what that output shows: app installed, process alive, memory, battery level, text present in the accessibility tree | Anything about the camera image or physical alignment |
| Unit tests, emulator runs, e2e on an emulator | Their own gates (Q5, e2e) | Physical-device results |

The agent's job: build the checklist for the session, tell the tester the exact steps, record each answer exactly as reported, run read-only adb diagnostics when a phone is connected, and summarise. If no phone is connected (`adb devices` lists nothing), every device result is NOT TESTED.

## Result categories

- **PASSED**: the expected result was observed under the stated conditions, and the evidence is recorded.
- **FAILED**: the observed result differs from the expected one, including crashes, freezes, partial passes (for example 2 of 3 attempts), and "mostly worked". Record what actually happened.
- **NOT TESTED**: not run, blocked, run without evidence, or run on the wrong build or device. Give the reason.

Never round up. When unsure, use NOT TESTED. A gate counts as passed on the device only when every required case is PASSED.

## Before the session

1. Record: date, `git rev-parse --short HEAD`, build variant (debug or release), phone model and Android version (`adb shell getprop ro.product.model`, `adb shell getprop ro.build.version.release`), tester name, conditions.
2. Use a release build (`npx expo run:android --device --variant release`) for anything timed or performance related.
3. Prepare the fixtures the cases need: TM-01, CARD-EN, CARD-HI, CARD-KN, BLANK, NEG-xx.
4. For the battery check: charge to at least 60%, then unplug USB charging or use wireless adb.

## Protocol

Each case lists steps, the expected result, and the evidence to keep. DT IDs refer to `docs/DEVICE-TESTS.md`.

| ID | Area | Steps | Expected | Evidence |
| --- | --- | --- | --- | --- |
| PD-01 | Camera permission | Fresh install. Deny, then allow. Reinstall, choose "Don't allow" twice (blocked), use "Open settings", grant, return. Revoke camera in system settings while the app is in the background, then return. | Each state from §8 (`CAM_PERMISSION_DENIED`, `CAM_PERMISSION_BLOCKED`) appears with its button. Revoking while backgrounded never crashes and shows the denied state. (DT-G1-01) | Screenshot of each state |
| PD-02 | Focus | Capture CARD-EN at D30 and D100, and once deliberately out of focus (move during capture). | Sharp captures read the text. A blurred capture shows `OCR_LOW_QUALITY` or `OCR_NO_TEXT`, never confident garbage labels. | Still plus overlay screenshot for each |
| PD-03 | Dim light | TM-01 under L3. Capture 5 times. | Low-quality hint shown. No confident wrong translation or highlight. (DT-ERR-03) | Screenshots, count of captures with hint |
| PD-04 | Rotated phone | With auto-rotate on, hold the phone landscape while the camera runs, then capture. Repeat at a 30° tilt and upside down. | UI stays portrait. Overlays on the captured still sit on their source text, so orientation is handled. Nothing is mirrored. | Screenshots compared with the physical text |
| PD-05 | Camera interruption and background | During preview: press Home and return; lock and unlock; pull down the notification shade; open another camera app, then return (DT-ERR-01); background the app for 30 s mid-Guide (DT-G4-06). | Preview resumes, or `CAM_UNAVAILABLE` with Retry. No crash. No frozen preview still showing live overlays. Guide returns to the same step or resets safely. | Screen recording |
| PD-06 | Stale overlays | Show overlays, then pan to a different sign, cover the lens, and move far away. In Guide, point away from TM-01 for 5 s. | Live mode: old labels disappear within their time-to-live (D-020). Freeze-frame: labels belong to the still and go away when returning to live view. Guide hides the highlight and pauses (`GD_MACHINE_LOST`). | Screen recording with time from movement to labels clearing |
| PD-07 | Two locales | Run Translate and Explore on TM-01 with target Hindi, then Kannada. Repeat with the phone's system language set to Hindi. | Correct script with no missing-glyph boxes, no clipped marks above or below the line, wrapping instead of overflow, UI strings localised. Speak appears only when a voice exists for that language. (DT-G2-01, DT-G4-05) | Screenshots per locale |
| PD-08 | Fixture independence | Turn on airplane mode and Bluetooth off on the phone (and on the fixture device if TM-01 is a simulator). Run Guide. Cover the lens mid-step. Show screen cards out of order. Show the expected next card for one frame only. | Guide advances only when the camera sees the checkpoint in two consecutive observations (D-019). Covering the lens never advances it. Out-of-order cards never advance or rewind it. Nothing depends on a network or shared state with the fixture. | Screen recording plus a second camera filming the fixture |
| PD-09 | Battery and performance | Release build. Run 10 minutes of continuous camera use (live mode if it shipped, otherwise a capture every 15 s). At 0, 5 and 10 minutes the agent records `adb shell dumpsys battery` (level, temperature), `adb shell dumpsys meminfo com.overlaykit.app` (total PSS) and `adb shell dumpsys thermalservice` (status). Time 20 captures for AT-G1-05. | No crash, ANR, thermal shutdown or OS kill. Memory does not rise steadily. Latency meets AT-G1-05 (p50 ≤ 1.5 s, p95 ≤ 3 s). Battery drop and temperature are recorded; there is no threshold for them yet. | Agent-observed adb output, tester-observed timings |

Run only the cases the session's gate needs, and mark the rest NOT TESTED with the reason "out of scope for this session".

## Recording

Append to `docs/DEVICE-TESTS.md` under "Results", using its session template, with these columns:

```
| Test ID | Result | Observed by | Measurement | Notes / evidence path |
| --- | --- | --- | --- | --- |
| PD-03 | FAILED | Tester: <name> | hint shown <n>/5 | <what went wrong>; docs/device-results/<date>/pd-03-*.png |
| PD-09 | PASSED | Agent: adb dumpsys (memory, battery); Tester: timings | PSS <0/5/10 min>; battery <start→end>; p50 <s>, p95 <s> | adb output pasted below the table |
| PD-04 | NOT TESTED | — | — | <reason, e.g. phone not available> |
```

The rows above are a format example, not results.

Then write a one-paragraph summary: counts of PASSED, FAILED and NOT TESTED, which gate each failure blocks, and the next action. Never write "device validated" or "works on device" for anything that isn't PASSED with evidence.
