# OverlayKit: Devpost text

Status: **draft with placeholders** (2026-11-19, spec 04 task 12.3, updated for the any-machine Guide). Nothing here may be pasted into Devpost until each statement is checked against [release-claims.md](release-claims.md) and a PASSED row in [DEVICE-TESTS.md](DEVICE-TESTS.md). Text in `<angle brackets>` is not filled in. Submission closes 4 Dec 2026, 2:00 pm Pacific. Re-check the rules page before submitting.

**Category:** Frankenstein

## What it does

OverlayKit is an Android camera app for standing in front of a machine or sign whose text you don't read well. It draws translations over the text in the camera image. You pick a goal, by tapping text or by voice, and it suggests one step at a time and highlights the text to use. On the next screen it looks for the change the step expected, and moves on after it sees it twice in a row, or after you tap Done. It never moves on a timer and never presses anything on the machine.

The steps are AI suggestions and can be wrong. Every step says so. A step can only point at text the camera actually read. If the text is not found, there is no highlight. The highlight is a flat 2D box on the image, not augmented reality.

There are two planners. The default, Gemma 4 E2B (Apache-2.0), runs on the phone through Google's LiteRT-LM. The optional second planner uses Google's Gemini Live. It sends camera frames, microphone audio, the goal and the recognized text lines to Google, only after the user agrees and taps "Start Gemini Live", with a "Streaming to Google" banner and a Stop button on screen. Gemini Live is not on-device and needs the network and the user's own Google API key. With the on-device planner, no image leaves the phone.

## Limits (state these)

- Android only. iOS is not built or tested.
- The camera reads English and Hindi text. It does not read Kannada text.
- Hindi and Kannada app text and step text are machine-written and **not reviewed by a fluent speaker** (D-031).
- Nothing is measured on the owner's phone yet: speed, memory, battery, and Hindi or Kannada planning quality. `<fill from DT-G5-07 only if a record exists, otherwise leave as "not measured">`
- Translation of recognized text uses Google ML Kit on-device translation, text only. `<state the result of DT-G2-* when it exists>`
- The release APK is debug-signed and meant for testing. `<repo link: pending>` `<release link: pending>` `<video link: pending>`

## How we built it with Kiro

List only features that have an entry in [kiro-evidence.md](kiro-evidence.md). Copy the status table from that file at submission time. Today it records steering files, one hook command run by hand, and one sub-agent run. Do not list a hook, skill, MCP server or Power as used unless the evidence file has a dated entry for it. `<fill at submission>`

Specs 01 to 05 are in `.kiro/specs/`. Spec 05 changed the product from one verified ticket machine to any machine with AI-planned steps.

## Disclosures

- The app started from the `create-expo-app` Expo SDK 58 template.
- The first design used a self-made simulated ticket machine (TM-01) with AI-generated artwork and our own text (D-032). The owner dropped it (D-043). It is not used by the app, and the product makes no claim about any specific machine.
- Models and licences: Gemma 4 E2B is Apache-2.0 (attribution in the README). Gemma 3 1B is an optional sideload under the Gemma Terms of Use and is not distributed by this project. Gemini Live is a Google service used with the user's own key.
- MIT licence, Akash Singh.

## Check before pasting

- [ ] No "verified", "correct", "AR" or "world tracking".
- [ ] Gemini Live is never called on-device or offline.
- [ ] No number appears that has no DT record.
- [ ] Links work while logged out.
